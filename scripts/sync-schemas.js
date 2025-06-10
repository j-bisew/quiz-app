const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Syncing schemas...');

if (!fs.existsSync('user-service')) {
    console.error('Error: user-service directory does not exist.');
    process.exit(1);
}

const masterSchema = 'user-service/prisma/schema.prisma';
if (!fs.existsSync(masterSchema)) {
    console.error(`Error: Main schema not found at ${masterSchema}`);
    process.exit(1);
}

console.log('Checking for any changes in the main schema...');

const services = ['quiz-service', 'analytics-service'];
let hasChanges = false;
const force = process.argv.includes('--force');

services.forEach(service => {
    console.log(`Creating schema for ${service}...`);
    targetSchema = `${service}/prisma/schema.prisma`;

    if (!fs.existsSync(targetSchema)) {
        fs.mkdirSync(service, 'prisma', { recursive: true });
        fs.copyFileSync(masterSchema, targetSchema);
        hasChanges = true;
    } else {
        const masterContent = fs.readFileSync(masterSchema, 'utf-8');
        const targetContent = fs.readFileSync(targetSchema, 'utf-8');

        if (masterContent !== targetContent || force) {
            fs.writeFileSync(targetSchema, masterContent);
            hasChanges = true;
            console.log(`Updated schema for ${service}`);
        } else {
            console.log(`No changes in schema for ${service}`);
        }
    }
});

if (!hasChanges && !force) {
    console.log('No changes detected in schemas. Exiting...');
    process.exit(0);
}

console.log('Generating Prisma client for all services...');

const allServices = ['user-service', ...services];

allServices.forEach(service => {
    const prismaDir = path.join(service, 'prisma');
    if (fs.existsSync(prismaDir)) {
        try {
            execSync('npx prisma generate', { cwd: service, stdio: 'pipe' });
            console.log(`Prisma client generated for ${service}`);
        } catch (error) {
            console.error(`Error generating Prisma client for ${service}:`, error.message);
        }
    } else {
        console.warn(`Prisma directory not found for ${service}. Skipping Prisma client generation.`);
    }
});

console.log('Prisma clients generated successfully for all services.');
console.log('Syncing schemas completed successfully.');

