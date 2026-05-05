#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ───────── WiFi ───────────────────────────────────────────────────────────────
char WIFI_SSID[64] = "Testwifi";
char WIFI_PASS[64] = "12345678";

const char* SERVER    = "airflowanalysis.xyz";
const int   PORT      = 443;
const char* DEVICE_ID = "ARDUINO_001";

#define DHT_PIN   4
#define DHT_TYPE  DHT22
#define GAS_PIN   A0
#define WHITE_LED 6
#define RED_LED   5
#define BUZZER    7

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT               dht(DHT_PIN, DHT_TYPE);

// One shared SSL client — recreated per request to avoid state corruption
unsigned long lastSend      = 0;
unsigned long lastConfig    = 0;
unsigned long lastLcdSwitch = 0;
bool          lcdPage       = false;

float tempLimit = 35.0;
float humLimit  = 70.0;
int   gasLimit  = 500;

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
    Serial.println("\n[WiFi] Connected");
    lcdShow("WiFi Connected!", "");
    delay(1000);
  } else {
    lcdShow("WiFi Failed!", "Restarting...");
    delay(3000);
    NVIC_SystemReset();
  }
}

// ── Forward declarations ──────────────────────────────────────────────────────
void sendData();
void pollConfig();

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

  // One retry on bad read
  if (isnan(temp) || isnan(hum)) {
    delay(200);
    temp = dht.readTemperature();
    hum  = dht.readHumidity();
  }
  if (isnan(temp) || isnan(hum)) {
    Serial.println("[DHT] Failed");
    lcdShow("DHT Error!", "Check pin 4");
    return;
  }

  int  gas      = analogRead(GAS_PIN);
  bool exceeded = (temp > tempLimit) || (hum > humLimit) || (gas > gasLimit);
  setAlert(exceeded);

  // LCD display
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

  // Build JSON payload
  JsonDocument doc;
  doc["device_id"]   = DEVICE_ID;
  doc["wifi_ssid"]   = WIFI_SSID;
  doc["temperature"] = temp;
  doc["humidity"]    = hum;
  doc["gas"]         = gas;
  String body;
  serializeJson(doc, body);

  // Fresh SSL client per request — avoids stale connection issues
  WiFiSSLClient ssl;
  HttpClient    http(ssl, SERVER, PORT);
  http.beginRequest();
  http.post("/api/iot/data");
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", (int)body.length());
  http.beginBody();
  http.print(body);
  http.endRequest();

  int code = http.responseStatusCode();
  http.responseBody();  // must drain

  Serial.print("[SEND] "); Serial.print(code);
  Serial.print(" T="); Serial.print(temp, 1);
  Serial.print(" H="); Serial.print(hum, 1);
  Serial.print(" G="); Serial.print(gas);
  if (exceeded) Serial.print(" *** ALERT ***");
  Serial.println();
}

// ─────────────────────────────────────────────────────────────────────────────
void pollConfig() {
  WiFiSSLClient ssl;
  HttpClient    http(ssl, SERVER, PORT);

  http.get("/api/iot/config");
  int code = http.responseStatusCode();
  Serial.print("[CONFIG] HTTP: "); Serial.println(code);

  if (code != 200) { http.responseBody(); return; }

  String payload = http.responseBody();
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

  Serial.print("[CONFIG] T<"); Serial.print(nT);
  Serial.print(" H<"); Serial.print(nH);
  Serial.print(" G<"); Serial.print(nG);
  Serial.print(" limUpd="); Serial.print(limUpdated);
  Serial.print(" wifiUpd="); Serial.println(wifiUpdated);

  if (nT != tempLimit || nH != humLimit || nG != gasLimit) {
    tempLimit = nT; humLimit = nH; gasLimit = nG;
    Serial.println("[CONFIG] Limits applied!");
    lcdShow("Limits Updated!", "");
    delay(600);
  }

  // ACK limits — fresh client, no shared state
  if (limUpdated) {
    WiFiSSLClient ackSsl;
    HttpClient    ack(ackSsl, SERVER, PORT);
    ack.beginRequest();
    ack.post("/api/iot/config/ack");
    ack.sendHeader("Content-Length", "0");
    ack.endRequest();
    ack.responseBody();
    Serial.println("[CONFIG] Limits acked");
  }

  // ACK wifi + reconnect
  if (wifiUpdated) {
    // Extract strings safely — copy before doc goes out of scope
    String newSsid = doc["wifi_ssid"]     | "";
    String newPass = doc["wifi_password"] | "";
    if (newSsid.length() > 0) {
      Serial.print("[WiFi] Switching to: "); Serial.println(newSsid);
      lcdShow("WiFi Changing...", newSsid.c_str());

      WiFiSSLClient ackSsl;
      HttpClient    ack(ackSsl, SERVER, PORT);
      ack.beginRequest();
      ack.post("/api/iot/wifi/ack");
      ack.sendHeader("Content-Length", "0");
      ack.endRequest();
      ack.responseBody();

      strncpy(WIFI_SSID, newSsid.c_str(), 63);
      strncpy(WIFI_PASS, newPass.c_str(), 63);
      WIFI_SSID[63] = '\0';
      WIFI_PASS[63] = '\0';
      WiFi.disconnect();
      delay(500);
      connectWiFi();
    }
  }
}
