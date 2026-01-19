/**
 * DIAGNOSE SNAPSHOT COUNTS
 * 
 * This script checks how many snapshots are actually stored per session
 */

const mongoose = require('mongoose');
require('dotenv').config();

const GazeSession = require('./models/GazeSession');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/asd_db';

async function diagnoseSnapshots() {
    console.log('\n🔍 SNAPSHOT COUNT DIAGNOSTIC');
    console.log('='.repeat(70));
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Get all live gaze sessions
        const sessions = await GazeSession.find({
            module: 'live_gaze',
            snapshots: { $exists: true }
        }).sort({ createdAt: -1 });
        
        console.log(`Found ${sessions.length} Live Gaze sessions\n`);
        
        // Analyze snapshot counts
        const stats = {
            total: sessions.length,
            withZeroSnapshots: 0,
            withOneSnapshot: 0,
            withMultipleSnapshots: 0,
            snapshotCounts: {}
        };
        
        console.log('📊 Snapshot Count Analysis:\n');
        
        sessions.forEach((session, i) => {
            const count = session.snapshots?.length || 0;
            
            if (count === 0) stats.withZeroSnapshots++;
            else if (count === 1) stats.withOneSnapshot++;
            else stats.withMultipleSnapshots++;
            
            stats.snapshotCounts[count] = (stats.snapshotCounts[count] || 0) + 1;
            
            // Show first 15 sessions
            if (i < 15) {
                const name = session.guestInfo?.childName || session.guestInfo?.email || 'Unknown';
                console.log(`${i + 1}. ${session._id.toString().substring(0, 8)}... - ${name}`);
                console.log(`   Status: ${session.status}, Snapshots: ${count}`);
                console.log(`   Date: ${new Date(session.createdAt).toLocaleString()}`);
                
                // Show first 3 snapshot paths
                if (count > 0) {
                    console.log(`   First images:`);
                    session.snapshots.slice(0, 3).forEach((snap, idx) => {
                        console.log(`      ${idx + 1}. ${snap.imagePath}`);
                    });
                    if (count > 3) {
                        console.log(`      ... and ${count - 3} more`);
                    }
                }
                console.log('');
            }
        });
        
        console.log('='.repeat(70));
        console.log('📈 Summary:');
        console.log(`   Total Sessions: ${stats.total}`);
        console.log(`   With 0 snapshots: ${stats.withZeroSnapshots}`);
        console.log(`   With 1 snapshot: ${stats.withOneSnapshot} ⚠️`);
        console.log(`   With multiple snapshots: ${stats.withMultipleSnapshots} ✅`);
        
        console.log('\n📊 Snapshot Count Distribution:');
        Object.entries(stats.snapshotCounts)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([count, sessions]) => {
                console.log(`   ${count} snapshots: ${sessions} sessions`);
            });
        
        // If most sessions have only 1 snapshot, that's the problem
        if (stats.withOneSnapshot > stats.withMultipleSnapshots) {
            console.log('\n❌ PROBLEM DETECTED!');
            console.log('   Most sessions have only 1 snapshot.');
            console.log('   This means images are not being saved properly during live gaze.');
            console.log('\n💡 Possible causes:');
            console.log('   1. Frontend only sending 1 image instead of multiple');
            console.log('   2. Socket.io not capturing all frames');
            console.log('   3. send-for-review endpoint only receiving 1 snapshot');
        } else if (stats.withMultipleSnapshots > 0) {
            console.log('\n✅ GOOD! Multiple snapshots are being saved.');
            console.log('   Some sessions have multiple snapshots, so the system works.');
            console.log('   Check frontend to ensure it displays ALL snapshots.');
        }
        
        console.log('\n' + '='.repeat(70) + '\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected\n');
    }
}

if (require.main === module) {
    diagnoseSnapshots().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { diagnoseSnapshots };
