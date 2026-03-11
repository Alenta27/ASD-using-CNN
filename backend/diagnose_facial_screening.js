/**
 * Facial Screening System - Diagnostic Tool
 * Run this to check if all components are working
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const TESTS = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function log(message, type = 'info') {
    const icons = {
        info: 'ℹ️ ',
        success: '✅',
        warning: '⚠️ ',
        error: '❌',
        test: '🧪'
    };
    console.log(`${icons[type]} ${message}`);
}

function separator() {
    console.log('─'.repeat(60));
}

async function checkFileExists(filePath, description) {
    log(`Checking ${description}...`, 'test');
    
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        log(`${description} exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'success');
        TESTS.passed++;
        return true;
    } else {
        log(`${description} NOT FOUND: ${filePath}`, 'error');
        TESTS.failed++;
        return false;
    }
}

async function checkPythonEnvironment() {
    log('Checking Python environment...', 'test');
    
    return new Promise((resolve) => {
        const pythonCheck = spawn('python', ['--version']);
        
        let version = '';
        pythonCheck.stdout.on('data', (data) => {
            version += data.toString();
        });
        
        pythonCheck.on('close', (code) => {
            if (code === 0) {
                log(`Python installed: ${version.trim()}`, 'success');
                TESTS.passed++;
                
                // Check dependencies
                checkPythonDependencies();
                resolve(true);
            } else {
                log('Python not found or not in PATH', 'error');
                TESTS.failed++;
                resolve(false);
            }
        });
    });
}

function checkPythonDependencies() {
    log('Checking Python dependencies...', 'test');
    
    const checkCmd = spawn('python', ['-c', 'import tensorflow, cv2, numpy; print("OK")']);
    
    let output = '';
    checkCmd.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    checkCmd.on('close', (code) => {
        if (code === 0 && output.includes('OK')) {
            log('All Python dependencies available', 'success');
            TESTS.passed++;
        } else {
            log('Python dependencies missing. Run: pip install -r requirements.txt', 'error');
            TESTS.failed++;
        }
    });
}

async function checkBackendServer() {
    log('Checking backend server...', 'test');
    
    try {
        const response = await axios.get('http://localhost:5000/api/health', {
            timeout: 3000
        });
        
        if (response.data.status === 'OK') {
            log('Backend server is running on port 5000', 'success');
            TESTS.passed++;
            return true;
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            log('Backend server is NOT running. Start it with: cd backend && node index.js', 'warning');
        } else {
            log(`Backend check failed: ${error.message}`, 'warning');
        }
        TESTS.warnings++;
        return false;
    }
}

async function checkFrontendFiles() {
    log('Checking frontend files...', 'test');
    
    const frontendPage = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'FacialScreeningPage.jsx');
    
    if (fs.existsSync(frontendPage)) {
        const content = fs.readFileSync(frontendPage, 'utf8');
        
        // Check for key functions
        const hasImagePreview = content.includes('setImagePreview');
        const hasAnalyze = content.includes('handleAnalyze');
        const hasFormData = content.includes('FormData');
        
        if (hasImagePreview && hasAnalyze && hasFormData) {
            log('Frontend component properly configured', 'success');
            TESTS.passed++;
        } else {
            log('Frontend component missing key functionality', 'error');
            TESTS.failed++;
        }
    } else {
        log('Frontend page not found', 'error');
        TESTS.failed++;
    }
}

function checkUploadsDirectory() {
    log('Checking uploads directory...', 'test');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        log('Uploads directory created', 'success');
        TESTS.passed++;
    } else {
        log('Uploads directory exists', 'success');
        TESTS.passed++;
    }
}

async function runDiagnostics() {
    console.log('\n');
    separator();
    console.log('FACIAL SCREENING SYSTEM - DIAGNOSTIC TOOL');
    separator();
    console.log('\n');
    
    // File checks
    log('FILE SYSTEM CHECKS', 'info');
    separator();
    await checkFileExists(
        path.join(__dirname, 'ai_model', 'asd_detection_model.h5'),
        'CNN Model'
    );
    await checkFileExists(
        path.join(__dirname, 'ai_model', 'predict.py'),
        'Python Prediction Script'
    );
    await checkFileExists(
        path.join(__dirname, 'routes', 'predictRoutes.js'),
        'Backend Route'
    );
    checkUploadsDirectory();
    
    console.log('\n');
    
    // Python checks
    log('PYTHON ENVIRONMENT CHECKS', 'info');
    separator();
    await checkPythonEnvironment();
    
    // Wait for async checks
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n');
    
    // Backend checks
    log('BACKEND SERVER CHECKS', 'info');
    separator();
    await checkBackendServer();
    
    console.log('\n');
    
    // Frontend checks
    log('FRONTEND CHECKS', 'info');
    separator();
    await checkFrontendFiles();
    
    console.log('\n');
    separator();
    console.log('DIAGNOSTIC SUMMARY');
    separator();
    console.log(`✅ Passed:   ${TESTS.passed}`);
    console.log(`❌ Failed:   ${TESTS.failed}`);
    console.log(`⚠️  Warnings: ${TESTS.warnings}`);
    console.log('\n');
    
    if (TESTS.failed === 0 && TESTS.warnings === 0) {
        log('ALL SYSTEMS OPERATIONAL! 🎉', 'success');
        log('You can now use the facial screening system.', 'info');
    } else if (TESTS.failed === 0) {
        log('System is mostly operational. Check warnings above.', 'warning');
    } else {
        log('System has errors. Please fix the failed checks above.', 'error');
    }
    
    separator();
    console.log('\n');
}

// Run diagnostics
runDiagnostics();
