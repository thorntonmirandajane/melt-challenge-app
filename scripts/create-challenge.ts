import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createChallenge() {
  try {
    // Create a challenge that is active right now
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    const challenge = await prisma.challenge.create({
      data: {
        shop: 'bowmar-nutrition-test.myshopify.com',
        name: '30-Day Weight Loss Challenge',
        description: 'Join our 30-day weight loss challenge and track your progress!',
        startDate,
        endDate,
        isActive: true,
      },
    });

    console.log('✅ Challenge created successfully!');
    console.log('Challenge ID:', challenge.id);
    console.log('Challenge Name:', challenge.name);
    console.log('Start Date:', challenge.startDate);
    console.log('End Date:', challenge.endDate);
    console.log('Is Active:', challenge.isActive);
  } catch (error) {
    console.error('❌ Error creating challenge:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createChallenge();
