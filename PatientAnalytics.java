import java.io.*;
import java.net.*;
import java.util.*;

public class PatientAnalytics {
    private static final int PORT = 8081;
    private static List<PatientRecord> patientHistory = new ArrayList<>();

    static class PatientRecord {
        String name;
        int age;
        String emergencyLevel;
        int heartRate;
        int oxygenLevel;

        public PatientRecord(String data) {
            // Simple parsing - in production use proper JSON library
            this.name = extractValue(data, "name");
            this.age = Integer.parseInt(extractValue(data, "age"));
            this.emergencyLevel = extractValue(data, "emergencyLevel");
            this.heartRate = Integer.parseInt(extractValue(data, "heartRate"));
            this.oxygenLevel = Integer.parseInt(extractValue(data, "oxygenLevel"));
        }
    }

    private static String extractValue(String data, String key) {
        String search = key + "=";
        int start = data.indexOf(search);
        if (start == -1) return "";
        start += search.length();
        int end = data.indexOf("&", start);
        if (end == -1) end = data.indexOf(",", start);
        if (end == -1) return data.substring(start).trim();
        return data.substring(start, end).trim();
    }

    private static void handleRequest(Socket clientSocket) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
        PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true);
        
        String requestLine = in.readLine();
        System.out.println("Request: " + requestLine);

        // Read headers
        int contentLength = 0;
        String line;
        while ((line = in.readLine()) != null && !line.isEmpty()) {
            if (line.startsWith("Content-Length:")) {
                contentLength = Integer.parseInt(line.substring(15).trim());
            }
        }

        // Read body
        String body = "";
        if (contentLength > 0) {
            char[] bodyChars = new char[contentLength];
            in.read(bodyChars, 0, contentLength);
            body = new String(bodyChars);
        }

        String response;
        if (requestLine.startsWith("POST /store-patient")) {
            try {
                PatientRecord record = new PatientRecord(body);
                patientHistory.add(record);
                String result = "{\"success\":true,\"message\":\"Patient stored\",\"total\":" + patientHistory.size() + "}";
                response = buildResponse(200, result);
            } catch (Exception e) {
                response = buildResponse(400, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        } else if (requestLine.startsWith("GET /analytics")) {
            String analytics = "{\"totalPatients\":" + patientHistory.size() + ",\"message\":\"Analytics endpoint\"}";
            response = buildResponse(200, analytics);
        } else {
            response = buildResponse(404, "{\"error\":\"Not found\"}");
        }

        out.print(response);
        out.flush();
        clientSocket.close();
    }

    private static String buildResponse(int status, String body) {
        String statusText = status == 200 ? "OK" : (status == 400 ? "Bad Request" : "Not Found");
        return "HTTP/1.1 " + status + " " + statusText + "\r\n" +
               "Content-Type: application/json\r\n" +
               "Access-Control-Allow-Origin: *\r\n" +
               "Content-Length: " + body.length() + "\r\n\r\n" +
               body;
    }

    public static void main(String[] args) {
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("Java Server running on http://localhost:" + PORT);
            while (true) {
                Socket clientSocket = serverSocket.accept();
                handleRequest(clientSocket);
            }
        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
