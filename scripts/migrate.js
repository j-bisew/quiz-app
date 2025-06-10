const { execSync } = require('child_process');
const fs = require('fs');

if (!fs.existsSync('user-service')) {
    console.error('Error: user-service directory does not exist.');
    process.exit(1);
}

const args = process.argv.slice(2);
const name = args[0]

if (!name) {
    console.error('Error: --name argument is required');
    process.exit(1);
}

if (typeof name !== 'string' || name.trim() === '') {
    console.error('Error: --name must be a string');
    process.exit(1);
}

if (name.includes(' ') || !/^[a-zA-Z0-9_-]+$/.test(name)) {
    console.error('Error: --name cannot contain spaces or special characters');
    process.exit(1);
}

console.log(`Applying migration ${name} to user-service...`);

try {
    execSync(`npx prisma migrate dev --name ${name}`, {
        cwd: 'user-service',
        stdio: 'pipe'
    });
    console.log(`Migration ${name} applied successfully to user-service`);
} catch (error) {
    console.error(`Error applying migration ${name}:`, error.message);
    process.exit(1);
}
