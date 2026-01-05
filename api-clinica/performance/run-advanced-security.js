#!/usr/bin/env node

const { spawn } = require('child_process');

const advancedTests = [
  {
    name: 'Advanced Data Security Testing',
    file: 'data-security-advanced.yml',
    description: 'Tests data exfiltration, privilege escalation, and tampering'
  },
  {
    name: 'HIPAA/LGPD Compliance Testing',
    file: 'compliance-testing.yml',
    description: 'Validates medical data compliance and regulations'
  },
  {
    name: 'Encryption & Cryptography Testing',
    file: 'encryption-testing.yml',
    description: 'Tests encryption, hashing, and cryptographic security'
  }
];

async function runAdvancedTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔒 Running: ${test.name}`);
    console.log(`📋 Description: ${test.description}`);
    console.log(`⏱️  Started at: ${new Date().toISOString()}\n`);

    const artillery = spawn('npx', ['artillery', 'run', test.file], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    artillery.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${test.name} completed successfully`);
        resolve();
      } else {
        console.log(`\n❌ ${test.name} failed with code ${code}`);
        reject(new Error(`Test failed: ${test.name}`));
      }
    });
  });
}

async function runAllAdvancedTests() {
  console.log('🛡️  ADVANCED DATA SECURITY TESTING SUITE');
  console.log('==========================================\n');
  
  for (const test of advancedTests) {
    try {
      await runAdvancedTest(test);
      console.log('⏳ Waiting 30 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      console.error(`Failed to run ${test.name}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n🏆 All advanced security tests completed!');
  console.log('📊 Review the results for security compliance validation.');
}

// Run individual test if specified
const testName = process.argv[2];
if (testName) {
  const test = advancedTests.find(t => t.file.includes(testName));
  if (test) {
    runAdvancedTest(test).catch(console.error);
  } else {
    console.log('Available advanced tests:');
    advancedTests.forEach(t => console.log(`- ${t.file.replace('.yml', '')}`));
  }
} else {
  runAllAdvancedTests().catch(console.error);
}