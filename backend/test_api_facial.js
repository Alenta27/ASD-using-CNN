/**
 * Test script for Facial Screening API
 * Tests the complete /api/predict endpoint
 */

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const API_URL = 'http://localhost:5000/api/predict';

async function testFacialPredictionAPI() {
    console.log('=' .repeat(60));
    console.log('TESTING FACIAL SCREENING API');
    console.log('=' .repeat(60));

    // Check if test image exists
    const testImagePath = path.join(__dirname, 'uploads', 'test_face.jpg');
    
    if (!fs.existsSync(testImagePath)) {
        console.error('❌ Test image not found:', testImagePath);
        console.log('Please run: python test_facial_prediction.py first');
        return;
    }

    try {
        // Create FormData
        const form = new FormData();
        form.append('image', fs.createReadStream(testImagePath));
        form.append('patientId', 'test-patient-123');

        console.log('\n📤 Sending POST request to:', API_URL);
        console.log('📸 Image:', testImagePath);

        // Send request
        const response = await axios.post(API_URL, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('\n✅ Response received:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.error) {
            console.log('\n⚠️  Expected behavior: No face detected in test image');
            console.log('Try uploading a real face photo to test prediction.');
        } else if (response.data.prediction && response.data.confidence !== undefined) {
            console.log('\n🎯 Prediction:', response.data.prediction);
            console.log('📊 Confidence:', (response.data.confidence * 100).toFixed(2) + '%');
        }

    } catch (error) {
        console.error('\n❌ API Test Failed:');
        
        if (error.code === 'ECONNREFUSED') {
            console.error('   Backend server is not running!');
            console.error('   Start it with: cd backend && node index.js');
        } else if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        } else {
            console.error('   Error:', error.message);
        }
    }

    console.log('\n' + '='.repeat(60));
}

// Run test
testFacialPredictionAPI();
