#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>
#endif

#define PORT 8080
#define BUFFER_SIZE 4096
#define MAX_DOCTORS 8

typedef struct {
    int id;
    char name[100];
    char specialty[100];
    char experience[50];
    int available;
} Doctor;

typedef struct {
    char name[100];
    int age;
    char gender[20];
    char bloodGroup[10];
    char bp[20];
    int heartRate;
    float temperature;
    int oxygenLevel;
    int respiratoryRate;
    int painLevel;
    char symptoms[500];
    char medicalHistory[500];
    char emergencyLevel[20];
    int emergencyScore;
} Patient;

Doctor doctors[MAX_DOCTORS] = {
    {1, "Dr. Sarah Johnson", "Emergency Medicine", "15 years", 1},
    {2, "Dr. Michael Chen", "Cardiology", "12 years", 1},
    {3, "Dr. Emily Rodriguez", "Internal Medicine", "10 years", 1},
    {4, "Dr. James Wilson", "Critical Care", "18 years", 1},
    {5, "Dr. Priya Patel", "Pulmonology", "8 years", 1},
    {6, "Dr. Robert Taylor", "Neurology", "20 years", 1},
    {7, "Dr. Lisa Anderson", "General Surgery", "14 years", 1},
    {8, "Dr. David Kumar", "Pediatrics", "11 years", 1}
};

void assessEmergency(Patient *patient) {
    int score = 0;

    if (patient->heartRate > 120 || patient->heartRate < 50) score += 3;
    else if (patient->heartRate > 100 || patient->heartRate < 60) score += 2;
    else if (patient->heartRate > 90) score += 1;

    if (patient->oxygenLevel < 90) score += 3;
    else if (patient->oxygenLevel < 94) score += 2;
    else if (patient->oxygenLevel < 96) score += 1;

    if (patient->temperature > 103 || patient->temperature < 95) score += 3;
    else if (patient->temperature > 101 || patient->temperature < 96) score += 2;
    else if (patient->temperature > 99.5) score += 1;

    int systolic, diastolic;
    sscanf(patient->bp, "%d/%d", &systolic, &diastolic);

    if (systolic > 180 || systolic < 90 || diastolic > 120 || diastolic < 60) score += 3;
    else if (systolic > 160 || systolic < 100 || diastolic > 100 || diastolic < 70) score += 2;
    else if (systolic > 140 || diastolic > 90) score += 1;

    if (patient->painLevel >= 8) score += 3;
    else if (patient->painLevel >= 6) score += 2;
    else if (patient->painLevel >= 4) score += 1;

    if (patient->respiratoryRate > 24 || patient->respiratoryRate < 12) score += 2;
    else if (patient->respiratoryRate > 20) score += 1;

    patient->emergencyScore = score;

    if (score >= 10) strcpy(patient->emergencyLevel, "Critical");
    else if (score >= 7) strcpy(patient->emergencyLevel, "High");
    else if (score >= 4) strcpy(patient->emergencyLevel, "Medium");
    else strcpy(patient->emergencyLevel, "Low");
}

void getDoctorsJSON(char *buffer) {
    strcat(buffer, "[");
    for (int i = 0; i < MAX_DOCTORS; i++) {
        char temp[500];
        sprintf(
            temp,
            "{\"id\":%d,\"name\":\"%s\",\"specialty\":\"%s\",\"experience\":\"%s\",\"available\":%d}",
            doctors[i].id,
            doctors[i].name,
            doctors[i].specialty,
            doctors[i].experience,
            doctors[i].available
        );
        strcat(buffer, temp);
        if (i < MAX_DOCTORS - 1) strcat(buffer, ",");
    }
    strcat(buffer, "]");
}

int assignDoctor(int doctorId) {
    for (int i = 0; i < MAX_DOCTORS; i++) {
        if (doctors[i].id == doctorId && doctors[i].available) {
            doctors[i].available = 0;
            return 1;
        }
    }
    return 0;
}

void parsePatientData(char *body, Patient *patient) {
    char *token;
    char temp[BUFFER_SIZE];

    strcpy(temp, body);
    token = strtok(temp, "&");

    while (token != NULL) {
        char key[100], value[500];
        sscanf(token, "%[^=]=%[^\n]", key, value);

        if (strcmp(key, "name") == 0) strcpy(patient->name, value);
        else if (strcmp(key, "age") == 0) patient->age = atoi(value);
        else if (strcmp(key, "gender") == 0) strcpy(patient->gender, value);
        else if (strcmp(key, "bloodGroup") == 0) strcpy(patient->bloodGroup, value);
        else if (strcmp(key, "bp") == 0) strcpy(patient->bp, value);
        else if (strcmp(key, "heartRate") == 0) patient->heartRate = atoi(value);
        else if (strcmp(key, "temperature") == 0) patient->temperature = atof(value);
        else if (strcmp(key, "oxygenLevel") == 0) patient->oxygenLevel = atoi(value);
        else if (strcmp(key, "respiratoryRate") == 0) patient->respiratoryRate = atoi(value);
        else if (strcmp(key, "painLevel") == 0) patient->painLevel = atoi(value);
        else if (strcmp(key, "symptoms") == 0) strcpy(patient->symptoms, value);
        else if (strcmp(key, "medicalHistory") == 0) strcpy(patient->medicalHistory, value);

        token = strtok(NULL, "&");
    }
}
int findDoctorById(int id) {
    for (int i = 0; i < MAX_DOCTORS; i++) {
        if (doctors[i].id == id && doctors[i].available == 1) {
            return i;
        }
    }
    return -1;
}

void addDoctor(char* body) {
    int id;
    char name[100], specialty[100];
    int experience;
    sscanf(body, "id=%d&name=%99[^&]&specialty=%99[^&]&experience=%d", 
           &id, name, specialty, &experience);
    
    // Find empty slot or update existing
    for (int i = 0; i < MAX_DOCTORS; i++) {
        if (doctors[i].id == 0 || doctors[i].id == id) {
            doctors[i].id = id;
            strcpy(doctors[i].name, name);
            strcpy(doctors[i].specialty, specialty);
            sprintf(doctors[i].experience, "%d years", experience);
            doctors[i].available = 1;
            return;
        }
    }
}

void handleRequest(int client_socket) {
    char buffer[BUFFER_SIZE] = {0};
    char response[BUFFER_SIZE * 2] = {0};

#ifdef _WIN32
    recv(client_socket, buffer, BUFFER_SIZE, 0);
#else
    read(client_socket, buffer, BUFFER_SIZE);
#endif

    if (strstr(buffer, "GET /doctors") != NULL) {
        char json[BUFFER_SIZE] = {0};
        getDoctorsJSON(json);
        sprintf(response,
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: application/json\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Content-Length: %ld\r\n"
            "\r\n%s",
            (long)strlen(json), json);
    } 
    // ⭐⭐⭐ NEW CASE - ADD THIS ⭐⭐⭐
    else if (strstr(buffer, "POST /add-doctor") != NULL) {
        char body[BUFFER_SIZE];
        char* body_start = strstr(buffer, "\r\n\r\n");
        if (body_start) {
            strcpy(body, body_start + 4);
            addDoctor(body);
            char json[256];
            sprintf(json, "{\"success\":true,\"message\":\"Doctor added\"}");
            sprintf(response,
                "HTTP/1.1 200 OK\r\n"
                "Content-Type: application/json\r\n"
                "Access-Control-Allow-Origin: *\r\n"
                "Content-Length: %ld\r\n"
                "\r\n%s", 
                (long)strlen(json), json);
        } else {
            sprintf(response, "HTTP/1.1 400 Bad Request\r\n\r\n");
        }
    }
    // ⭐⭐⭐ END NEW PART ⭐⭐⭐
    else if (strstr(buffer, "POST /assess") != NULL) {
        // Your existing assess code (unchanged)
        Patient patient = {0};
        // ... rest stays same
    } 
    else if (strstr(buffer, "POST /assign") != NULL) {
        // Your existing assign code (unchanged)
    } 
    else {
        sprintf(response, "HTTP/1.1 404 Not Found\r\n\r\n");
    }

#ifdef _WIN32
    send(client_socket, response, (int)strlen(response), 0);
    closesocket(client_socket);
#else
    write(client_socket, response, strlen(response));
    close(client_socket);
#endif
}


int main() {
    int server_socket;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);

#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2,2), &wsa) != 0) {
        printf("WSAStartup failed\n");
        return 1;
    }
#endif

    server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket < 0) {
        perror("Socket creation failed");
        exit(1);
    }

    int opt = 1;
#ifdef _WIN32
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));
#else
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    if (bind(server_socket, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("Bind failed");
        exit(1);
    }

    if (listen(server_socket, 10) < 0) {
        perror("Listen failed");
        exit(1);
    }

    printf("C Server running on http://localhost:%d\n", PORT);

    while (1) {
        int client_socket =
            accept(server_socket, (struct sockaddr*)&client_addr, &client_len);
        if (client_socket < 0) continue;
        handleRequest(client_socket);
    }

#ifdef _WIN32
    closesocket(server_socket);
    WSACleanup();
#else
    close(server_socket);
#endif
    return 0;
}
