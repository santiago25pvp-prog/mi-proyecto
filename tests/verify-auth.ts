import axios from 'axios';

async function testAuth() {
    console.log("Running auth verification...");

    // 1. Test no token
    try {
        await axios.post('http://localhost:3000/ingest', { data: 'test' });
        console.error("Test 1 failed: Expected 401 for no token, but got 200");
    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            console.log("Test 1 passed: 401 Unauthorized for no token");
        } else {
            console.error("Test 1 failed: Expected 401, but got", error.response?.status);
        }
    }

    // 2. Test invalid token
    try {
        await axios.post('http://localhost:3000/ingest', { data: 'test' }, {
            headers: { Authorization: 'Bearer invalid-token' }
        });
        console.error("Test 2 failed: Expected 401 for invalid token, but got 200");
    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            console.log("Test 2 passed: 401 Unauthorized for invalid token");
        } else {
            console.error("Test 2 failed: Expected 401, but got", error.response?.status);
        }
    }
}

testAuth();
