// Configuration - Backend Server URLs
const C_SERVER_URL = 'http://localhost:8080';
const JAVA_SERVER_URL = 'http://localhost:8081';

let patientData = {};
let vitalsChart, healthChart;
let doctors = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDoctorsFromServer();
});

// Load doctors from C backend server
async function loadDoctorsFromServer() {
    try {
        const response = await fetch(`${C_SERVER_URL}/doctors`);
        doctors = await response.json();
        console.log('Doctors loaded from C server:', doctors);
    } catch (error) {
        console.error('Error loading doctors from server:', error);
        // Fallback to local data if server is not running
        doctors = [
            { id: 1, name: "Dr. Sarah Johnson", specialty: "Emergency Medicine", experience: "15 years", available: true },
            { id: 2, name: "Dr. Michael Chen", specialty: "Cardiology", experience: "12 years", available: true },
            { id: 3, name: "Dr. Emily Rodriguez", specialty: "Internal Medicine", experience: "10 years", available: true },
            { id: 4, name: "Dr. James Wilson", specialty: "Critical Care", experience: "18 years", available: true },
            { id: 5, name: "Dr. Priya Patel", specialty: "Pulmonology", experience: "8 years", available: true },
            { id: 6, name: "Dr. Robert Taylor", specialty: "Neurology", experience: "20 years", available: true },
            { id: 7, name: "Dr. Lisa Anderson", specialty: "General Surgery", experience: "14 years", available: true },
            { id: 8, name: "Dr. David Kumar", specialty: "Pediatrics", experience: "11 years", available: true }
        ];
    }
}

// Form submission handler
document.getElementById('patientForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await collectPatientData();
    await assessEmergencyWithBackend();
    await storePatientDataInJava();
    displayDashboard();
    document.getElementById('page1').classList.remove('active');
    document.getElementById('page2').classList.add('active');
});

// Collect patient data from form
async function collectPatientData() {
    patientData = {
        name: document.getElementById('name').value,
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        bloodGroup: document.getElementById('bloodGroup').value,
        bp: document.getElementById('bp').value,
        heartRate: parseInt(document.getElementById('heartRate').value),
        temperature: parseFloat(document.getElementById('temperature').value),
        oxygenLevel: parseInt(document.getElementById('oxygenLevel').value),
        respiratoryRate: parseInt(document.getElementById('respiratoryRate').value) || 0,
        painLevel: parseInt(document.getElementById('painLevel').value) || 0,
        symptoms: document.getElementById('symptoms').value,
        medicalHistory: document.getElementById('medicalHistory').value
    };
}

// Assess emergency level using C backend server
async function assessEmergencyWithBackend() {
    try {
        const response = await fetch(`${C_SERVER_URL}/assess`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(patientData).toString()
        });
        
        const result = await response.json();
        patientData.emergencyLevel = result.emergencyLevel;
        patientData.emergencyScore = result.emergencyScore;
        
        // Get emergency class for styling
        if (result.emergencyLevel === 'Critical') patientData.emergencyClass = 'critical';
        else if (result.emergencyLevel === 'High') patientData.emergencyClass = 'high';
        else if (result.emergencyLevel === 'Medium') patientData.emergencyClass = 'medium';
        else patientData.emergencyClass = 'low';
        
        console.log('Emergency assessment from C server:', result);
    } catch (error) {
        console.error('Error assessing emergency:', error);
        // Fallback to local assessment
        assessEmergencyLocal();
    }
}

// Local emergency assessment (fallback)
function assessEmergencyLocal() {
    let score = 0;
    
    if (patientData.heartRate > 120 || patientData.heartRate < 50) score += 3;
    else if (patientData.heartRate > 100 || patientData.heartRate < 60) score += 2;
    else if (patientData.heartRate > 90) score += 1;

    if (patientData.oxygenLevel < 90) score += 3;
    else if (patientData.oxygenLevel < 94) score += 2;
    else if (patientData.oxygenLevel < 96) score += 1;

    if (patientData.temperature > 103 || patientData.temperature < 95) score += 3;
    else if (patientData.temperature > 101 || patientData.temperature < 96) score += 2;
    else if (patientData.temperature > 99.5) score += 1;

    const bpParts = patientData.bp.split('/');
    const systolic = parseInt(bpParts[0]);
    const diastolic = parseInt(bpParts[1]);
    if (systolic > 180 || systolic < 90 || diastolic > 120 || diastolic < 60) score += 3;
    else if (systolic > 160 || systolic < 100 || diastolic > 100 || diastolic < 70) score += 2;
    else if (systolic > 140 || diastolic > 90) score += 1;

    if (patientData.painLevel >= 8) score += 3;
    else if (patientData.painLevel >= 6) score += 2;
    else if (patientData.painLevel >= 4) score += 1;

    if (patientData.respiratoryRate > 24 || patientData.respiratoryRate < 12) score += 2;
    else if (patientData.respiratoryRate > 20) score += 1;

    if (score >= 10) {
        patientData.emergencyLevel = 'Critical';
        patientData.emergencyClass = 'critical';
    } else if (score >= 7) {
        patientData.emergencyLevel = 'High';
        patientData.emergencyClass = 'high';
    } else if (score >= 4) {
        patientData.emergencyLevel = 'Medium';
        patientData.emergencyClass = 'medium';
    } else {
        patientData.emergencyLevel = 'Low';
        patientData.emergencyClass = 'low';
    }
}

// Store patient data in Java analytics server
async function storePatientDataInJava() {
    try {
        const response = await fetch(`${JAVA_SERVER_URL}/store-patient`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData)
        });
        
        const result = await response.json();
        console.log('Patient data stored in Java server:', result);
    } catch (error) {
        console.error('Error storing patient data in Java server:', error);
    }
}

// Display dashboard with patient information
function displayDashboard() {
    // Display Emergency Level
    document.getElementById('emergencyLevel').innerHTML = 
        `<div class="emergency-badge ${patientData.emergencyClass}">
            Emergency Level: ${patientData.emergencyLevel}
        </div>`;

    // Display Patient Summary
    const summaryHTML = `
        <div class="summary-item"><strong>Name:</strong> ${patientData.name}</div>
        <div class="summary-item"><strong>Age:</strong> ${patientData.age} years</div>
        <div class="summary-item"><strong>Gender:</strong> ${patientData.gender}</div>
        <div class="summary-item"><strong>Blood Group:</strong> ${patientData.bloodGroup || 'N/A'}</div>
        <div class="summary-item"><strong>Blood Pressure:</strong> ${patientData.bp} mmHg</div>
        <div class="summary-item"><strong>Heart Rate:</strong> ${patientData.heartRate} bpm</div>
        <div class="summary-item"><strong>Temperature:</strong> ${patientData.temperature}°F</div>
        <div class="summary-item"><strong>Oxygen Level:</strong> ${patientData.oxygenLevel}%</div>
        <div class="summary-item"><strong>Pain Level:</strong> ${patientData.painLevel}/10</div>
        <div class="summary-item"><strong>Symptoms:</strong> ${patientData.symptoms}</div>
    `;
    document.getElementById('patientSummary').innerHTML = summaryHTML;

    // Create Charts
    createVitalsChart();
    createHealthChart();

    // Display Doctors
    displayDoctors();
}

// Create vitals chart
function createVitalsChart() {
    const ctx = document.getElementById('vitalsChart').getContext('2d');
    
    if (vitalsChart) vitalsChart.destroy();

    vitalsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Heart Rate', 'Oxygen Level', 'Temperature', 'Pain Level'],
            datasets: [{
                label: 'Current Values',
                data: [
                    patientData.heartRate,
                    patientData.oxygenLevel,
                    patientData.temperature,
                    patientData.painLevel * 10
                ],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Create health chart
function createHealthChart() {
    const ctx = document.getElementById('healthChart').getContext('2d');
    
    if (healthChart) healthChart.destroy();

    const bpParts = patientData.bp.split('/');
    const systolic = parseInt(bpParts[0]);
    const diastolic = parseInt(bpParts[1]);

    healthChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['BP Systolic', 'BP Diastolic', 'Resp. Rate', 'Pain', 'Oxygen'],
            datasets: [{
                label: 'Patient Metrics',
                data: [
                    systolic / 2,
                    diastolic,
                    patientData.respiratoryRate || 16,
                    patientData.painLevel * 10,
                    patientData.oxygenLevel
                ],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Display doctors grid
function displayDoctors() {
    const grid = document.getElementById('doctorsGrid');
    grid.innerHTML = '';

    doctors.forEach(doctor => {
        const card = document.createElement('div');
        card.className = `doctor-card ${doctor.available ? 'available' : 'busy'}`;
        card.innerHTML = `
            <span class="doctor-status ${doctor.available ? 'status-available' : 'status-busy'}">
                ${doctor.available ? 'Available' : 'Busy'}
            </span>
            <div class="doctor-name">${doctor.name}</div>
            <div class="doctor-specialty">${doctor.specialty}</div>
            <div class="doctor-experience">Experience: ${doctor.experience}</div>
            <button class="btn assign-btn" 
                    onclick="assignDoctor(${doctor.id})" 
                    ${!doctor.available ? 'disabled' : ''}>
                ${doctor.available ? 'Assign Doctor' : 'Not Available'}
            </button>
        `;
        grid.appendChild(card);
    });
}

// Assign doctor to patient
async function assignDoctor(doctorId) {
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor || !doctor.available) return;

    try {
        // Call C backend to assign doctor
        const response = await fetch(`${C_SERVER_URL}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `doctorId=${doctorId}`
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`${doctor.name} has been assigned to ${patientData.name}\n\nEmergency Level: ${patientData.emergencyLevel}\nSpecialty: ${doctor.specialty}`);
            doctor.available = false;
            displayDoctors();
        }
    } catch (error) {
        console.error('Error assigning doctor:', error);
        // Fallback to local assignment
        alert(`${doctor.name} has been assigned to ${patientData.name}\n\nEmergency Level: ${patientData.emergencyLevel}\nSpecialty: ${doctor.specialty}`);
        doctor.available = false;
        displayDoctors();
    }
}

// Go back to registration page
function goBack() {
    document.getElementById('page2').classList.remove('active');
    document.getElementById('page1').classList.add('active');
}

// Get analytics from Java server
async function getAnalytics() {
    try {
        const response = await fetch(`${JAVA_SERVER_URL}/analytics`);
        const analytics = await response.json();
        console.log('Analytics from Java server:', analytics);
        return analytics;
    } catch (error) {
        console.error('Error getting analytics:', error);
        return null;
    }
}
// Doctor form submission
document.getElementById('doctorForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const doctorData = {
        id: parseInt(document.getElementById('doctorId').value),
        name: document.getElementById('doctorName').value,
        specialty: document.getElementById('doctorSpecialty').value,
        experience: document.getElementById('doctorExperience').value + ' years',
        available: true
    };

    try {
        const response = await fetch(`${CSERVERURL}/add-doctor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(doctorData).toString()
        });
        const result = await response.json();
        if (result.success) {
            alert('Doctor added successfully!');
            document.getElementById('doctorForm').reset();
            loadDoctorsFromServer(); // Refresh doctors list
        }
    } catch (error) {
        console.error('Error adding doctor:', error);
        alert('Error adding doctor. Please try again.');
    }
});
