#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#include <PubSubClient.h>
#include <ArduinoJson.h>

// ======================================================
// MQTT
// ======================================================
const char* mqtt_server = "192.168.3.23"; // IP do computador/servidor local
const int mqtt_port = 1883;

const char* deviceId = "1";
const char* tokenAuth = "labflow-token-esp32-001";

WiFiClient espClient;
PubSubClient mqtt(espClient);

// ======================================================
// LCD
// ======================================================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ======================================================
// WIFI
// ======================================================
const char* ssid = "Schirmer";
const char* password = "g254156325";

// ======================================================
// RFID EXTERNO
// ======================================================
#define SS_PIN_EXT 5
#define RST_PIN_EXT 22
MFRC522 rfidExt(SS_PIN_EXT, RST_PIN_EXT);

// ======================================================
// RFID INTERNO
// ======================================================
#define SS_PIN_INT 21
#define RST_PIN_INT 27
MFRC522 rfidInt(SS_PIN_INT, RST_PIN_INT);

// ======================================================
// BUZZER
// ======================================================
#define BUZZER 4

// ======================================================
// LEDS
// ======================================================
#define LED_GREEN 25
#define LED_RED   26

// ======================================================
// BOTÕES
// ======================================================
#define BUTTON 14       // Botão externo
#define BUTTON_EXIT 13  // Botão interno

// ======================================================
// FECHADURA
// ======================================================
#define LOCK 2 // GPIO da fechadura

// ======================================================
// CARTÃO UNIVERSAL
// ======================================================
const String CARTAO_UNIVERSAL = "F5 E2 39 D5"; // NUPEEDE

// ======================================================
// ESTADO
// ======================================================
bool modoLivre = false;
String ultimaOrigemConsulta = "";

// ======================================================
// CONTROLE DE LEITURA REPETIDA RFID
// ======================================================
String ultimoUIDLido = "";
String ultimoLeitorLido = "";
unsigned long tempoUltimaLeitura = 0;
const unsigned long intervaloMesmoCartao = 3000; // 3 segundos

// ======================================================
// PROTÓTIPOS
// ======================================================
void atualizarLCD();
void atualizarLEDs();
void bipCurto();
void bipErro();
void abrirPorta();
void conectarMQTT();
void enviarEvento(String evento, String descricao);
void enviarTentativaAcesso(String uidHex, String origem);
String uidToString(byte *uid, byte size);
bool leituraRepetida(String uidHex, String leitor);
void alternarModoLivre(String origem);
void mqttCallback(char* topic, byte* payload, unsigned int length);

// ======================================================
// FUNÇÕES DE INTERFACE
// ======================================================
void atualizarLEDs() {
  if (modoLivre) {
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED, LOW);
  } else {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, HIGH);
  }
}

void atualizarLCD() {
  lcd.clear();

  if (modoLivre) {
    lcd.setCursor(0, 0);
    lcd.print("SALA ABERTA");

    lcd.setCursor(0, 1);
    lcd.print("Botao Liberado");
  } else {
    lcd.setCursor(0, 0);
    lcd.print("SALA FECHADA");

    lcd.setCursor(0, 1);
    lcd.print("Aguardando...");
  }
}

void bipCurto() {
  digitalWrite(BUZZER, LOW);
  delay(200);
  digitalWrite(BUZZER, HIGH);
}

void bipErro() {
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER, LOW);
    delay(150);
    digitalWrite(BUZZER, HIGH);
    delay(150);
  }
}

void abrirPorta() {
  bipCurto();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("PORTA ABERTA");

  lcd.setCursor(0, 1);
  lcd.print("Acesso Liberado");

  digitalWrite(LOCK, HIGH);

  delay(3000);

  digitalWrite(LOCK, LOW);

  atualizarLCD();
}

void alternarModoLivre(String origem) {
  modoLivre = !modoLivre;

  atualizarLEDs();

  lcd.clear();

  if (modoLivre) {
    Serial.println("MODO LIVRE ATIVADO");

    lcd.setCursor(0, 0);
    lcd.print("SALA ABERTA");

    lcd.setCursor(0, 1);
    lcd.print(origem);
  } else {
    Serial.println("MODO LIVRE DESATIVADO");

    lcd.setCursor(0, 0);
    lcd.print("SALA FECHADA");

    lcd.setCursor(0, 1);
    lcd.print(origem);
  }

  bipCurto();

  delay(1000);
  atualizarLCD();
}

// ======================================================
// FUNÇÕES RFID
// ======================================================
String uidToString(byte *uid, byte size) {
  String uidString = "";

  for (byte i = 0; i < size; i++) {
    if (uid[i] < 0x10) {
      uidString += "0";
    }

    uidString += String(uid[i], HEX);

    if (i < size - 1) {
      uidString += " ";
    }
  }

  uidString.toUpperCase();
  return uidString;
}

bool leituraRepetida(String uidHex, String leitor) {
  unsigned long agora = millis();

  if (uidHex == ultimoUIDLido &&
      leitor == ultimoLeitorLido &&
      agora - tempoUltimaLeitura < intervaloMesmoCartao) {
    Serial.println("Leitura repetida ignorada");
    return true;
  }

  ultimoUIDLido = uidHex;
  ultimoLeitorLido = leitor;
  tempoUltimaLeitura = agora;

  return false;
}

// ======================================================
// MQTT
// ======================================================
void conectarMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Conectando ao MQTT... ");

    String clientId = "ESP32-LabFlow-" + String(deviceId);

    if (mqtt.connect(clientId.c_str())) {
      Serial.println("conectado!");

      String responseTopic = "labflow/" + String(deviceId) + "/access/response";
      mqtt.subscribe(responseTopic.c_str());

      String firmwareTopic = "labflow/" + String(deviceId) + "/firmware/response";
      mqtt.subscribe(firmwareTopic.c_str());

      String statusTopic = "labflow/" + String(deviceId) + "/status";

      StaticJsonDocument<128> doc;
      doc["tokenAuth"] = tokenAuth;
      doc["status"] = "ONLINE";

      char buffer[128];
      serializeJson(doc, buffer);

      mqtt.publish(statusTopic.c_str(), buffer);

      Serial.print("Inscrito em: ");
      Serial.println(responseTopic);

    } else {
      Serial.print("falhou. Codigo: ");
      Serial.println(mqtt.state());
      delay(3000);
    }
  }
}

void enviarEvento(String evento, String descricao) {
  if (!mqtt.connected()) {
    conectarMQTT();
  }

  StaticJsonDocument<256> doc;

  doc["tokenAuth"] = tokenAuth;
  doc["evento"] = evento;
  doc["descricao"] = descricao;

  char buffer[256];
  serializeJson(doc, buffer);

  String topic = "labflow/" + String(deviceId) + "/event";

  mqtt.publish(topic.c_str(), buffer);

  Serial.print("Evento enviado para ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(buffer);
}

void enviarTentativaAcesso(String uidHex, String origem) {
  if (!mqtt.connected()) {
    conectarMQTT();
  }

  ultimaOrigemConsulta = origem;

  StaticJsonDocument<256> doc;

  doc["tokenAuth"] = tokenAuth;
  doc["uid"] = uidHex;
  doc["origem"] = origem;
  doc["evento"] = origem;

  char buffer[256];
  serializeJson(doc, buffer);

  String topic = "labflow/" + String(deviceId) + "/access/request";

  mqtt.publish(topic.c_str(), buffer);

  Serial.print("Tentativa enviada para ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(buffer);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Verificando...");

  lcd.setCursor(0, 1);
  if (origem == "RFID_INTERNO") {
    lcd.print("Cartao Interno");
  } else {
    lcd.print("Cartao Externo");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String mensagem;

  for (unsigned int i = 0; i < length; i++) {
    mensagem += (char)payload[i];
  }

  Serial.print("Mensagem recebida em ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(mensagem);

  StaticJsonDocument<256> doc;
  DeserializationError erro = deserializeJson(doc, mensagem);

  if (erro) {
    Serial.println("Erro ao interpretar JSON MQTT");
    return;
  }

  String topico = String(topic);

  if (topico.endsWith("/access/response")) {
    bool authorized = doc["authorized"] | false;
    const char* reason = doc["reason"] | "";

    Serial.print("Resposta acesso: ");
    Serial.println(reason);

    if (authorized) {
      if (ultimaOrigemConsulta == "RFID_EXTERNO") {
        Serial.println("SERVIDOR LIBEROU RFID EXTERNO");

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("ACESSO LIBERADO");
        lcd.setCursor(0, 1);
        lcd.print("Servidor OK");

        abrirPorta();

      } else if (ultimaOrigemConsulta == "RFID_INTERNO") {
        Serial.println("SERVIDOR LIBEROU RFID INTERNO");

        alternarModoLivre("Servidor OK");

      } else {
        Serial.println("Origem desconhecida na resposta MQTT");
      }

    } else {
      Serial.println("SERVIDOR NEGOU ACESSO");

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("ACESSO NEGADO");

      lcd.setCursor(0, 1);
      lcd.print(reason);

      bipErro();

      delay(1000);
      atualizarLCD();
    }

    ultimaOrigemConsulta = "";
  }
}

// ======================================================
// SETUP
// ======================================================
void setup() {
  Serial.begin(9600);

  // LCD
  Wire.begin(32, 33);

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("Sistema OK");

  // Buzzer
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, HIGH);

  // Fechadura
  pinMode(LOCK, OUTPUT);
  digitalWrite(LOCK, LOW);

  // LEDs
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  // Botões
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(BUTTON_EXIT, INPUT_PULLUP);

  atualizarLEDs();

  // SPI padrão do ESP32
  // SCK = 18
  // MISO = 19
  // MOSI = 23
  SPI.begin();

  // Configura SS dos dois leitores
  pinMode(SS_PIN_EXT, OUTPUT);
  pinMode(SS_PIN_INT, OUTPUT);

  // Desativa ambos inicialmente
  digitalWrite(SS_PIN_EXT, HIGH);
  digitalWrite(SS_PIN_INT, HIGH);

  // Inicializa RFID externo
  digitalWrite(SS_PIN_EXT, LOW);
  rfidExt.PCD_Init();
  digitalWrite(SS_PIN_EXT, HIGH);

  // Inicializa RFID interno
  digitalWrite(SS_PIN_INT, LOW);
  rfidInt.PCD_Init();
  digitalWrite(SS_PIN_INT, HIGH);

  Serial.println("Sistema iniciado");

  // Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi conectado!");
  Serial.print("IP da ESP32: ");
  Serial.println(WiFi.localIP());

  // MQTT
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(mqttCallback);

  conectarMQTT();

  // OTA
  ArduinoOTA.setPassword("srm");
  ArduinoOTA.begin();

  Serial.println("OTA pronto!");

  // LCD inicial
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("WiFi OK");

  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());

  delay(5000);
  atualizarLCD();
}

// ======================================================
// LOOP
// ======================================================
void loop() {
  ArduinoOTA.handle();

  if (!mqtt.connected()) {
    conectarMQTT();
  }

  mqtt.loop();

  // ====================================================
  // TESTA RFID INTERNO
  // ====================================================
  digitalWrite(SS_PIN_EXT, HIGH);
  digitalWrite(SS_PIN_INT, LOW);

  if (rfidInt.PICC_IsNewCardPresent() && rfidInt.PICC_ReadCardSerial()) {
    String uidHex = uidToString(rfidInt.uid.uidByte, rfidInt.uid.size);

    Serial.print("UID interno: ");
    Serial.println(uidHex);

    if (leituraRepetida(uidHex, "RFID_INTERNO")) {
      rfidInt.PICC_HaltA();
      rfidInt.PCD_StopCrypto1();
      digitalWrite(SS_PIN_INT, HIGH);
      return;
    }

    if (uidHex == CARTAO_UNIVERSAL) {
      Serial.println("CARTAO UNIVERSAL NO RFID INTERNO");

      alternarModoLivre("Cartao Universal");

    } else {
      enviarTentativaAcesso(uidHex, "RFID_INTERNO");
    }

    rfidInt.PICC_HaltA();
    rfidInt.PCD_StopCrypto1();
  }

  digitalWrite(SS_PIN_INT, HIGH);

  // ====================================================
  // BOTÃO EXTERNO
  // Funciona apenas se modoLivre estiver ativo
  // ====================================================
  if (modoLivre && digitalRead(BUTTON) == LOW) {
    Serial.println("BOTAO EXTERNO PRESSIONADO");

    enviarEvento("BOTAO_EXTERNO", "Porta aberta pelo botao externo em modo livre");

    abrirPorta();

    while (digitalRead(BUTTON) == LOW) {
      delay(10);
    }

    delay(200);
  }

  // ====================================================
  // BOTÃO INTERNO
  // Sempre abre a porta
  // ====================================================
  if (digitalRead(BUTTON_EXIT) == LOW) {
    Serial.println("BOTAO INTERNO PRESSIONADO");

    enviarEvento("BOTAO_INTERNO", "Porta aberta pelo botao interno");

    abrirPorta();

    while (digitalRead(BUTTON_EXIT) == LOW) {
      delay(10);
    }

    delay(200);
  }

  // ====================================================
  // TESTA RFID EXTERNO
  // ====================================================
  digitalWrite(SS_PIN_INT, HIGH);
  digitalWrite(SS_PIN_EXT, LOW);

  if (rfidExt.PICC_IsNewCardPresent() && rfidExt.PICC_ReadCardSerial()) {
    String uidHex = uidToString(rfidExt.uid.uidByte, rfidExt.uid.size);

    Serial.print("UID externo: ");
    Serial.println(uidHex);

    if (leituraRepetida(uidHex, "RFID_EXTERNO")) {
      rfidExt.PICC_HaltA();
      rfidExt.PCD_StopCrypto1();
      digitalWrite(SS_PIN_EXT, HIGH);
      return;
    }

    if (uidHex == CARTAO_UNIVERSAL) {
      Serial.println("CARTAO UNIVERSAL NO RFID EXTERNO");

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("ACESSO LIBERADO");

      lcd.setCursor(0, 1);
      lcd.print("Cartao Universal");

      abrirPorta();

      delay(1000);
      atualizarLCD();

    } else {
      enviarTentativaAcesso(uidHex, "RFID_EXTERNO");
    }

    rfidExt.PICC_HaltA();
    rfidExt.PCD_StopCrypto1();
  }

  digitalWrite(SS_PIN_EXT, HIGH);
}