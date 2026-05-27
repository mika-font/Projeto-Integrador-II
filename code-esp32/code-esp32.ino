#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// LCD
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===== WIFI =====
const char* ssid = "TauraBots";
const char* password = "robotica2024";

// ===== RFID EXTERNO =====
#define SS_PIN_EXT 5
#define RST_PIN_EXT 22
MFRC522 rfidExt(SS_PIN_EXT, RST_PIN_EXT);

// ===== RFID INTERNO =====
#define SS_PIN_INT 21
#define RST_PIN_INT 27
MFRC522 rfidInt(SS_PIN_INT, RST_PIN_INT);

// ===== BUZZER =====
#define BUZZER 4

// ===== LEDS =====
#define LED_GREEN 25
#define LED_RED   26

// ===== BOTÃO =====
#define BUTTON 14 // botão externo
#define BUTTON_EXIT 13 // botão interno

// ===== FECHADURA =====
#define LOCK 2 // MODIFICADO: Mudou do pino 2 para o pino 32 (Seguro)

// ===== CARTÕES AUTORIZADOS =====
byte allowedCards[2][4] = {
  {0xE6, 0x97, 0xA7, 0x1A}, // Schirmer
  {0x96, 0x93, 0x5A, 0x1A}  // Mikael
};

// ===== ESTADO =====
bool modoLivre = false;

bool isAuthorized(byte *uid) {
  for (int i = 0; i < 2; i++) {
    bool match = true;
    for (int j = 0; j < 4; j++) {
      if (uid[j] != allowedCards[i][j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

void atualizarLEDs() {
  if (modoLivre) {
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED, LOW);
  } else {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, HIGH);
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

  // Botão
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(BUTTON_EXIT, INPUT_PULLUP);

  atualizarLEDs();

  // Inicializa o SPI padrão do ESP32 (SCK=18, MISO=19, MOSI=23)
  SPI.begin();

  // Configura pinos de seleção como saída
  pinMode(SS_PIN_EXT, OUTPUT);
  pinMode(SS_PIN_INT, OUTPUT);

  // Desativa ambos os leitores colocando os pinos SS em nível ALTO
  digitalWrite(SS_PIN_EXT, HIGH);
  digitalWrite(SS_PIN_INT, HIGH);

  // Inicializa o RFID Externo isoladamente
  digitalWrite(SS_PIN_EXT, LOW);
  rfidExt.PCD_Init();
  digitalWrite(SS_PIN_EXT, HIGH);

  // Inicializa o RFID Interno isoladamente
  digitalWrite(SS_PIN_INT, LOW);
  rfidInt.PCD_Init();
  digitalWrite(SS_PIN_INT, HIGH);

  Serial.println("Sistema iniciado");

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");

  // OTA
  ArduinoOTA.setPassword("srm");
  ArduinoOTA.begin();
  Serial.println("OTA pronto!");

  // LCD
  lcd.clear();

  lcd.setCursor(0,0);
  lcd.print("WiFi OK");

  lcd.setCursor(0,1);
  lcd.print(WiFi.localIP());

  
  delay(5000);
  atualizarLCD();
}

void loop() {
  ArduinoOTA.handle();

  // ==========================================
  // TESTA RFID INTERNO
  // ==========================================
  digitalWrite(SS_PIN_EXT, HIGH); // Garante que o Externo está em silêncio
  digitalWrite(SS_PIN_INT, LOW);  // Ativa o Interno para comunicação
  
  // Inicializa rapidamente o chip interno para limpar o barramento caso ele trave
  rfidInt.PCD_Init(); 

  if (rfidInt.PICC_IsNewCardPresent() && rfidInt.PICC_ReadCardSerial()) {
    if (isAuthorized(rfidInt.uid.uidByte)) {
      modoLivre = !modoLivre;
      atualizarLCD();
      atualizarLEDs();
      if (modoLivre) {
        Serial.println("MODO LIVRE ATIVADO");
      } else {
        Serial.println("MODO LIVRE DESATIVADO");
      }
      bipCurto();
    } else {
      Serial.println("CARTAO INTERNO NEGADO");

      lcd.clear();

      lcd.setCursor(0,0);
      lcd.print("ACESSO NEGADO");

      lcd.setCursor(0,1);
      lcd.print("Cartao Interno");

      bipErro();

      delay(1000);
      atualizarLCD();
    }
    rfidInt.PICC_HaltA();
  }
  digitalWrite(SS_PIN_INT, HIGH); // Desativa o interno após o teste

  // ==========================================
  // BOTÃO EXTERNO
  // ==========================================
  if (modoLivre && digitalRead(BUTTON) == LOW) {
    Serial.println("BOTAO PRESSIONADO");
    abrirPorta();
    delay(300);
  }

  // ==========================================
  // BOTÃO INTERNO (SEMPRE FUNCIONA)
  // ==========================================

  if (digitalRead(BUTTON_EXIT) == LOW) {
    Serial.println("BOTAO INTERNO PRESSIONADO");

    abrirPorta();

    delay(300);
  }

  // ==========================================
  // TESTA RFID EXTERNO
  // ==========================================
  digitalWrite(SS_PIN_INT, HIGH); // Garante que o Interno está em silêncio
  digitalWrite(SS_PIN_EXT, LOW);  // Ativa o Externo para comunicação
  
  rfidExt.PCD_Init(); // Inicializa o externo para limpar o barramento

  if (rfidExt.PICC_IsNewCardPresent() && rfidExt.PICC_ReadCardSerial()) {
    Serial.print("UID: ");
    for (byte i = 0; i < rfidExt.uid.size; i++) {
      Serial.print(rfidExt.uid.uidByte[i], HEX);
      Serial.print(" ");
    }
    Serial.println();

    if (isAuthorized(rfidExt.uid.uidByte)) {
      abrirPorta();
      lcd.clear();

      lcd.setCursor(0,0);
      lcd.print("ACESSO LIBERADO");

      lcd.setCursor(0,1);
      lcd.print("Bem-vindo");

      delay(1000);
    } else {
      lcd.clear();

      lcd.setCursor(0,0);
      lcd.print("ACESSO NEGADO");

      lcd.setCursor(0,1);
      lcd.print("Cartao invalido");
      bipErro();
      delay(1000);

      atualizarLCD();
    }
    rfidExt.PICC_HaltA();
  }
  digitalWrite(SS_PIN_EXT, HIGH); // Desativa o externo após o teste
}