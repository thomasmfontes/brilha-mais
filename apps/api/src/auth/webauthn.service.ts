/* eslint-disable */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';
import { User, WebAuthnChallenge } from '@prisma/client';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialDescriptorJSON,
} from '@simplewebauthn/server';

@Injectable()
export class WebAuthnService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async getRegistrationOptions(user: User) {
    const rpName = 'Brilha Mais';
    const expectedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const rpID = new URL(expectedOrigin).hostname;

    const credentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId: user.id },
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: 'none',
      excludeCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports
          ? (cred.transports.split(',') as any[])
          : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Save challenge
    await this.prisma.webAuthnChallenge.create({
      data: {
        challenge: options.challenge,
        userId: user.id,
      },
    });

    return options;
  }

  async verifyRegistration(user: User, body: RegistrationResponseJSON) {
    const storedChallenge = await this.prisma.webAuthnChallenge.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!storedChallenge) {
      throw new BadRequestException('Challenge not found');
    }

    // Delete challenge
    await this.prisma.webAuthnChallenge.delete({
      where: { id: storedChallenge.id },
    });

    const expectedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const rpID = new URL(expectedOrigin).hostname;

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Registration verification error:', error);
      throw new BadRequestException(`Verification failed: ${message}`);
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const {
        credential,
        credentialDeviceType,
        credentialBackedUp,
      } = registrationInfo;

      const credentialIdBase64url = credential.id;
      const publicKeyBase64 =
        Buffer.from(credential.publicKey).toString('base64');
      const counter = credential.counter;

      // transports is located inside response in RegistrationResponseJSON
      const transportsList = body.response.transports
        ? body.response.transports.join(',')
        : null;

      await this.prisma.webAuthnCredential.create({
        data: {
          credentialId: credentialIdBase64url,
          publicKey: publicKeyBase64,
          counter: BigInt(counter),
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: transportsList,
          userId: user.id,
        },
      });

      return { verified: true };
    }

    return { verified: false };
  }

  async getAuthenticationOptions(body: { email?: string }) {
    const expectedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const rpID = new URL(expectedOrigin).hostname;

    let allowCredentials: PublicKeyCredentialDescriptorJSON[] | undefined =
      undefined;
    let userId: string | null = null;

    if (body && body.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: body.email },
      });
      if (user) {
        userId = user.id;
        const credentials = await this.prisma.webAuthnCredential.findMany({
          where: { userId: user.id },
        });
        allowCredentials = credentials.map((cred) => ({
          id: cred.credentialId,
          type: 'public-key' as const,
          transports: cred.transports
            ? (cred.transports.split(',') as any[])
            : undefined,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    await this.prisma.webAuthnChallenge.create({
      data: {
        challenge: options.challenge,
        userId,
      },
    });

    return options;
  }

  async verifyAuthentication(
    body: AuthenticationResponseJSON & { challenge?: string },
  ) {
    const credentialId = body.id;
    const credential = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId },
      include: { user: true },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    // Find challenge
    let challengeRecord: WebAuthnChallenge | null = null;
    if (body.challenge) {
      challengeRecord = await this.prisma.webAuthnChallenge.findFirst({
        where: { challenge: body.challenge },
      });
    }

    if (!challengeRecord) {
      challengeRecord = await this.prisma.webAuthnChallenge.findFirst({
        where: { userId: credential.userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!challengeRecord) {
      challengeRecord = await this.prisma.webAuthnChallenge.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!challengeRecord) {
      throw new BadRequestException('Challenge not found');
    }

    // Delete challenge
    await this.prisma.webAuthnChallenge.delete({
      where: { id: challengeRecord.id },
    });

    const expectedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const rpID = new URL(expectedOrigin).hostname;

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(
            Buffer.from(credential.publicKey, 'base64'),
          ),
          counter: Number(credential.counter),
          transports: credential.transports
            ? (credential.transports.split(',') as any[])
            : undefined,
        },
        requireUserVerification: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Authentication verification error:', error);
      throw new BadRequestException(`Verification failed: ${message}`);
    }

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      // Update counter
      await this.prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: {
          counter: BigInt(authenticationInfo.newCounter),
        },
      });

      const tokenResult = await this.authService.login(credential.user);

      return {
        verified: true,
        ...tokenResult,
      };
    }

    return { verified: false };
  }

  async getCredentials(user: User) {
    const credentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        credentialId: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
      },
    });
    return credentials;
  }

  async deleteCredential(user: User, credentialId: string) {
    const credential = await this.prisma.webAuthnCredential.findFirst({
      where: {
        id: credentialId,
        userId: user.id,
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    await this.prisma.webAuthnCredential.delete({
      where: { id: credentialId },
    });

    return { success: true };
  }
}
