#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ───────── Config ─────────────────────────────────────────────────────────────
char WIFI_SSID[64] = "Testwifi";
char WIFI_PASS[64] = "12345678";

const char* SERVER    = "airflowanalysis.xyz";
const int   PORT      = 80;          // ← HTTP port 80, nginx handles HTTPS termination
const char* DEVICE_ID = "ARDUINO_001";

#define DHT_PIN   4
#define DHT_TYPE  DHT22
#define GAS_PIN   A0
#define WHITE_LED 6
#define RED_LED   5
#define BUZZER    7

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT               dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend      = 0;
unsigned long lastConfig    = 0;
unsigned long lastLcdSwitch = 0;
bool          lcdPage       = false;

float tempLimit = 35.0;
float humLimit  = 70.0;
int   gasLimit  = 500;

// ── Forward declarations ──────────────────────────────────────────────────────
void sendData();
void pollConfig();
bool doPost(const char* path, const String& body, String& respBody);
bool doGet(const char* path, String& respBody);
void connectWiFi();

// ─────────────────────────────────────────────────────────────────────────────
void setAlert(bool on) {
  digitalWrite(RED_LED,   on ? HIGH : LOW);
  digitalWrite(WHITE_LED, on ? LOW  : HIGH);
  digitalWrite(BUZZER,    on ? HIGH : LOW);
}

void lcdShow(const char* l1, const char* l2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(l1);
  if (strlen(l2) > 0) { lcd.setCursor(0, 1); lcd.print(l2); }
}

void connectWiFi() {
  lcdShow("Connecting WiFi", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int t = 0;
  while (WiFi.status() != WL_CONNECTED && t < 40) { delay(500); Serial.print("."); t++; }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected: " + WiFi.localIP().toString());
    lcdShow("WiFi Connected!", "");
    delay(1000);
  } else {
    lcdShow("WiFi Failed!", "Restarting...");
    delay(3000);
    NVIC_SystemReset();
  }
}

// ── Single HTTP POST using plain WiFiClient (HTTP, not HTTPS) ─────────────────
// nginx on the server handles HTTPS — Arduino talks plain HTTP to port 80
bool doPost(const char* path, const String& body, String& respBody) {
  WiFiClient client;
  if (!client.connect(SERVER, PORT)) {
    Serial.println("[HTTP] Connect failed");
    return false;
  }

  // Send request
  client.print(String("POST ") + path + " HTTP/1.1\r\n");
  client.print(String("Host: ") + SERVER + "\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("Connection: close\r\n");
  client.print("Content-Length: " + String(body.length()) + "\r\n");
  client.print("\r\n");
  client.print(body);

  // Wait for response
  unsigned long timeout = millis();
  while (!client.available() && millis() - timeout < 5000) delay(10);

  // Read status line
  String statusLine = client.readStringUntil('\n');
  int code = -1;
  if (statusLine.startsWith("HTTP/")) {
    int sp1 = statusLine.indexOf(' ');
    int sp2 = statusLine.indexOf(' ', sp1 + 1);
    code = statusLine.substring(sp1 + 1, sp2).toInt();
  }

  // Skip headers
  while (client.available()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break;
  }

  // Read body
  respBody = "";
  while (client.available()) respBody += (char)client.read();
  client.stop();

  Serial.print("[HTTP POST] "); Serial.print(path);
  Serial.print(" → "); Serial.println(code);
  return (code >= 200 && code < 300);
}

bool doGet(const char* path, String& respBody) {
  WiFiClient client;
  if (!client.connect(SERVER, PORT)) {
    Serial.println("[HTTP] Connect failed");
    return false;
  }

  client.print(String("GET ") + path + " HTTP/1.1\r\n");
  client.print(String("Host: ") + SERVER + "\r\n");
  client.print("Connection: close\r\n");
  client.print("\r\n");

  unsigned long timeout = millis();
  while (!client.available() && millis() - timeout < 5000) delay(10);

  String statusLine = client.readStringUntil('\n');
  int code = -1;
  if (statusLine.startsWith("HTTP/")) {
    int sp1 = statusLine.indexOf(' ');
    int sp2 = statusLine.indexOf(' ', sp1 + 1);
    code = statusLine.substring(sp1 + 1, sp2).toInt();
  }

  while (client.available()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break;
  }

  respBody = "";
  while (client.available()) respBody += (char)client.read();
  client.stop();

  Serial.print("[HTTP GET] "); Serial.print(path);
  Serial.print(" → "); Serial.println(code);
  return (code >= 200 && code < 300);
}

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Wire.begin();
  lcd.init(); lcd.backlight();
  lcdShow("SmartTracker", "Starting...");
  pinMode(WHITE_LED, OUTPUT);
  pinMode(RED_LED,   OUTPUT);
  pinMode(BUZZER,    OUTPUT);
  setAlert(false);
  dht.begin();
  delay(2500);
  connectWiFi();
  pollConfig();
  lcdShow("Ready", DEVICE_ID);
  delay(800);
}

// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    lcdShow("WiFi Lost!", "Reconnecting...");
    connectWiFi();
    return;
  }
  unsigned long now = millis();
  if (now - lastSend      >= 2000) { lastSend = now;      sendData();   }
  if (now - lastConfig    >= 5000) { lastConfig = now;    pollConfig(); }
  if (now - lastLcdSwitch >= 3000) { lastLcdSwitch = now; lcdPage = !lcdPage; }
}

// ─────────────────────────────────────────────────────────────────────────────
void sendData() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    delay(200);
    temp = dht.readTemperature();
    hum  = dht.readHumidity();
  }
  if (isnan(temp) || isnan(hum)) {
    Serial.println("[DHT] Failed — check wiring on pin 4");
    lcdShow("DHT Error!", "Check pin 4");
    return;
  }

  int  gas      = analogRead(GAS_PIN);
  bool exceeded = (temp > tempLimit) || (hum > humLimit) || (gas > gasLimit);
  setAlert(exceeded);

  // LCD
  char l1[17], l2[17];
  if (!lcdPage) {
    snprintf(l1, 17, "T:%.1fC H:%.1f%%", temp, hum);
    snprintf(l2, 17, "G:%d%s", gas, exceeded ? " !ALERT" : "ppm");
  } else {
    snprintf(l1, 17, "Lim T<%.0f H<%.0f", tempLimit, humLimit);
    snprintf(l2, 17, "Lim Gas<%d", gasLimit);
  }
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(l1);
  lcd.setCursor(0, 1); lcd.print(l2);

  // JSON body
  JsonDocument doc;
  doc["device_id"]   = DEVICE_ID;
  doc["wifi_ssid"]   = WIFI_SSID;
  doc["temperature"] = temp;
  doc["humidity"]    = hum;
  doc["gas"]         = gas;
  String body;
  serializeJson(doc, body);

  String resp;
  bool ok = doPost("/api/iot/data", body, resp);

  Serial.print("[SEND] "); Serial.print(ok ? "OK" : "FAIL");
  Serial.print(" T="); Serial.print(temp, 1);
  Serial.print(" H="); Serial.print(hum, 1);
  Serial.print(" G="); Serial.print(gas);
  if (exceeded) Serial.print(" *** ALERT ***");
  Serial.println();
}

// ─────────────────────────────────────────────────────────────────────────────
void pollConfig() {
  String payload;
  if (!doGet("/api/iot/config", payload)) return;

  Serial.print("[CONFIG] Raw: "); Serial.println(payload);

  JsonDocument doc;
  if (deserializeJson(doc, payload)) {
    Serial.println("[CONFIG] JSON parse failed");
    return;
  }

  float nT = doc["temp_limit"]     | tempLimit;
  float nH = doc["humidity_limit"] | humLimit;
  int   nG = doc["gas_limit"]      | gasLimit;
  bool  limUpdated  = doc["limits_updated"]  | false;
  bool  wifiUpdated = doc["wifi_updated"]    | false;

  if (nT != tempLimit || nH != humLimit || nG != gasLimit) {
    tempLimit = nT; humLimit = nH; gasLimit = nG;
    Serial.print("[CONFIG] Limits → T<"); Serial.print(nT);
    Serial.print(" H<"); Serial.print(nH);
    Serial.print(" G<"); Serial.println(nG);
    lcdShow("Limits Updated!", "");
    delay(600);
  }

  if (limUpdated) {
    String r;
    doPost("/api/iot/config/ack", "{}", r);
    Serial.println("[CONFIG] Limits acked");
  }

  if (wifiUpdated) {
    String newSsid = doc["wifi_ssid"]     | "";
    String newPass = doc["wifi_password"] | "";
    if (newSsid.length() > 0) {
      Serial.print("[WiFi] Switching to: "); Serial.println(newSsid);
      lcdShow("WiFi Changing...", newSsid.c_str());
      String r;
      doPost("/api/iot/wifi/ack", "{}", r);
      strncpy(WIFI_SSID, newSsid.c_str(), 63); WIFI_SSID[63] = '\0';
      strncpy(WIFI_PASS, newPass.c_str(), 63); WIFI_PASS[63] = '\0';
      WiFi.disconnect();
      delay(500);
      connectWiFi();
    }
  }
}
