async function testLocalServer() {
    try {
        console.log('📡 Calling Local AI Server...');
        const resp = await fetch('http://localhost:3001/generateReadingPlan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: 'Faith',
                duration: 3,
                category: 'bible',
                difficulty: 'intermediate'
            })
        });

        console.log('📶 Status:', resp.status);
        const data = await resp.json();
        console.log('📝 Result Success:', data.success);
        if (!data.success) {
            console.error('❌ Error Message:', data.message);
            console.error('🔍 Details:', data.details);
        }
    } catch (e) {
        console.error('💥 Request Failed:', e.message);
    }
}

testLocalServer();
