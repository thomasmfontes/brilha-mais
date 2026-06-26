import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private authService: AuthService) {
    console.log('--- Microsoft Strategy Init ---');
    console.log('MICROSOFT_CLIENT_ID:', process.env.MICROSOFT_CLIENT_ID);
    const apiUrl = (process.env.API_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    super({
      clientID: process.env.MICROSOFT_CLIENT_ID || 'dummy',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'dummy',
      callbackURL: `${apiUrl}/auth/microsoft/callback`,
      scope: ['user.read', 'profile', 'email', 'openid', 'offline_access'],
      tenant: process.env.MICROSOFT_TENANT_ID || 'common',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    console.log('--- Microsoft Strategy Validate ---');
    console.log('Profile ID:', profile.id);
    console.log('DisplayName:', profile.displayName);

    const { displayName, emails, photos, id, _json } = profile;

    // Enhanced safety check for emails - try multiple fallbacks
    let email = null;
    if (emails && emails.length > 0) email = emails[0].value;
    else if (_json && _json.mail) email = _json.mail;
    else if (_json && _json.userPrincipalName) email = _json.userPrincipalName;
    else if (profile.mail) email = profile.mail;
    else if (profile.userPrincipalName) email = profile.userPrincipalName;

    if (!email) {
      console.error('--- Microsoft Strategy ERROR: No email found ---');
      console.log(
        'Profile context:',
        JSON.stringify({ id, displayName, _json }, null, 2),
      );
      return done(new Error('No email found in Microsoft profile'), null);
    }

    const user = {
      email,
      firstName: displayName?.split(' ')[0] || '',
      lastName: displayName?.split(' ').slice(1).join(' ') || '',
      picture: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
      provider: 'microsoft',
      providerId: id,
    };

    console.log('Mapped User:', user);

    try {
      const dbUser = await this.authService.validateOAuthUser(user);
      console.log('DB User Found/Created:', dbUser.id);
      done(null, dbUser);
    } catch (error) {
      console.error('Error in validateOAuthUser:', error);
      done(error, null);
    }
  }
}
