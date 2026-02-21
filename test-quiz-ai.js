async function testQuiz() {
    try {
        console.log('📡 Calling Local Quiz Server...');
        const resp = await fetch('http://localhost:3001/generateQuiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: 'Parables',
                difficulty: 'medium',
                questionCount: 3
            })
        });

        console.log('📶 Status:', resp.status);
        const data = await resp.json();
        console.log('📝 Result Success:', data.success);
    } catch (e) {
        console.error('💥 Failed:', e.message);
    }
}

testQuiz();
