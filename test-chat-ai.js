async function testChat() {
    try {
        console.log('📡 Calling Local AI Chat...');
        const resp = await fetch('http://localhost:3001/generateChatResponse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hello!',
                userName: 'Test User',
                context: []
            })
        });

        console.log('📶 Status:', resp.status);
        const data = await resp.json();
        if (resp.status !== 200) {
            console.error('❌ Error:', data);
        }
        console.log('📝 Result:', data.text ? 'RECEIVED' : 'FAILED');
    } catch (e) {
        console.error('💥 Failed:', e.message);
    }
}

testChat();
