
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUpdate() {
  const userId = '29e0956a-ad57-4e00-89ea-7fae5d0380c1'; 
  console.log('--- Iniciando teste de atualização para Super Admin ---');
  
  try {
    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { location: true } });
    if (!user) {
      console.log('Usuário não encontrado!');
      return;
    }
    
    // @ts-ignore
    console.log('Usuário atual:', { id: user.id, role: user.role, locationId: user.locationId });
    
    // Tenta simular o update que o frontend faz
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: user.avatarUrl }, 
      include: { location: true }
    });
    
    console.log('Update de banco OK!');
    
    // Simula o que o UserService faz no log de auditoria
    // O erro provável é ter UNDEFINED dentro do objeto de metadados
    const metadata = { 
      avatarUrl: user.avatarUrl, 
      userName: updated.name, 
      // @ts-ignore
      locationName: updated.location?.name 
    };
    
    console.log('Metadados que seriam enviados:', metadata);
    console.log('Tentando criar Log de Auditoria...');

    await prisma.auditLog.create({
      data: {
        action: 'Teste Diagnose',
        entity: updated.name || 'Usuário',
        entityId: userId,
        userId: userId,
        // @ts-ignore
        details: metadata
      }
    });
    
    console.log('Log de Auditoria OK!');
    
  } catch (error) {
    console.error('ERRO DETECTADO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
