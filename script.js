// Client-side JavaScript
// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
// Replace with your own Firebase config:
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    // ...other config...
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
function openTab(tabName, event) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    const tabButtons = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    document.getElementById(tabName).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

function toggleTimer() {
    const timerEnabled = document.getElementById('timerEnabled').checked;
    document.getElementById('timerOptions').style.display = timerEnabled ? 'flex' : 'none';
}

async function storeMessage() {
    const message = document.getElementById('secretMessage').value.trim();
    if (!message) {
        showResult('storeResult', 'error', 'Please enter a message');
        return;
    }

    const timerEnabled = document.getElementById('timerEnabled').checked;
    let unlockTime = null;

    if (timerEnabled) {
        const timeUnit = document.getElementById('timeUnit').value;
        const timeAmount = parseInt(document.getElementById('timeAmount').value);

        if (isNaN(timeAmount) || timeAmount < 1) {
            showResult('storeResult', 'error', 'Please enter a valid time amount');
            return;
        }

        // Calculate unlock time (current time + specified duration)
        const now = new Date();
        switch (timeUnit) {
            case 'minutes':
                now.setMinutes(now.getMinutes() + timeAmount);
                break;
            case 'hours':
                now.setHours(now.getHours() + timeAmount);
                break;
            case 'days':
                now.setDate(now.getDate() + timeAmount);
                break;
            case 'months':
                now.setMonth(now.getMonth() + timeAmount);
                break;
            case 'years':
                if (timeAmount > 5) {
                    showResult('storeResult', 'error', 'Maximum time lock is 5 years');
                    return;
                }
                now.setFullYear(now.getFullYear() + timeAmount);
                break;
        }
        unlockTime = now.getTime();
    }

    // Generate a random secret key (for early access)
    const secretKey = generateSecretKey();
    const messageId = generateId();
    const messageData = {
        id: messageId,
        message: message,
        unlockTime: unlockTime,
        secretKey: secretKey
    };

    try {
        // Store in Firestore (universal storage)
        await setDoc(doc(db, "messages", messageId), messageData);

        // Show success message with ID and secret key
        const resultDiv = document.getElementById('storeResult');
        resultDiv.innerHTML = `
            <h3>Message stored successfully!</h3>
            <p><strong>Message ID:</strong> ${messageId}</p>
            <p><strong>Secret Key:</strong> ${secretKey}</p>
            <p class="warning">Save these details to retrieve your message. The secret key will be needed to access the message before the unlock time.</p>
        `;
        resultDiv.className = 'success';
        resultDiv.style.display = 'block';
    } catch (error) {
        showResult('storeResult', 'error', 'Failed to store message. Please try again.');
        console.error(error);
    }
}

async function retrieveMessage() {
    const messageId = document.getElementById('messageId').value.trim();
    const secretKey = document.getElementById('secretKey').value.trim();

    if (!messageId) {
        showResult('retrieveResult', 'error', 'Please enter a message ID');
        return;
    }

    try {
        // Fetch from Firestore
        const docRef = doc(db, "messages", messageId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            showResult('retrieveResult', 'error', 'Message not found');
            return;
        }
        const messageData = docSnap.data();
        const now = new Date().getTime();

        // Check if message is time-locked
        if (messageData.unlockTime && now < messageData.unlockTime) {
            // Check if secret key is provided and correct
            if (!secretKey || secretKey !== messageData.secretKey) {
                const unlockDate = new Date(messageData.unlockTime);
                showResult('retrieveResult', 'error', `This message is locked until ${unlockDate.toLocaleString()}. You need the secret key to access it now.`);
                return;
            }
        }

        // Show the message
        const resultDiv = document.getElementById('retrieveResult');
        resultDiv.innerHTML = `
            <h3>Your Secret Message</h3>
            <div class="message-content">${messageData.message}</div>
        `;
        resultDiv.className = 'message';
        resultDiv.style.display = 'block';

        // Optionally, delete the message after retrieval
        // await deleteDoc(docRef);
    } catch (error) {
        showResult('retrieveResult', 'error', 'Failed to retrieve message. Please try again.');
        console.error(error);
    }
}

function showResult(elementId, className, message) {
    const resultDiv = document.getElementById(elementId);
    resultDiv.textContent = message;
    resultDiv.className = className;
    resultDiv.style.display = 'block';
}

function generateId() {
    return 'msg_' + Math.random().toString(36).substr(2, 9);
}

function generateSecretKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}