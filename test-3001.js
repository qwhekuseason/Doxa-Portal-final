async function testReachable() {
    try {
        const resp = await fetch("http://127.0.0.1:3001/");
        const data = await resp.json();
        console.log("3001 is reachable!", data);
    } catch (e) {
        console.error("3001 is NOT reachable via 127.0.0.1:", e.message);
    }
}
testReachable();
