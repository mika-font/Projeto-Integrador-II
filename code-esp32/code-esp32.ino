#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPI.h>
#include <MFRC522.h>

// ===== WIFI =====
const char* ssid = "TauraBots";
const char* password = "robotica2024";

// ===== RFID =====
#define SS_PIN 5
#define RST_PIN 22
MFRC522 rfid(SS_PIN, RST_PIN);

// ===== BUZZER =====
#define BUZZER 4

// ===== FECHADURA =====
#define LOCK 2

// ===== CARTÕES AUTORIZADOS =====
// COLOQUE AQUI OS UIDs DOS CARTÕES PERMITIDOS
byte allowedCards[2][4] = {
  {0xE6, 0x97, 0xA7, 0x1A}, // Schirmer
  {0x96, 0x93, 0x5A, 0x1A}  // Mikael
};

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

void setup() {
  Serial.begin(9600);

  // Buzzer
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, HIGH); // desligado (se for ativo)

  // Fechadura
  pinMode(LOCK, OUTPUT);
  digitalWrite(LOCK, LOW); // desligada

  // SPI + RFID
  SPI.begin();
  rfid.PCD_Init();

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado!");

  // OTA
  ArduinoOTA.begin();
  Serial.println("OTA pronto!");
}

void loop() {
  ArduinoOTA.handle();

  // Verifica cartão
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  Serial.print("UID: ");

  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i], HEX);
    Serial.print(" ");
  }
  Serial.println();

  if (isAuthorized(rfid.uid.uidByte)) {
    // Cartão autorizado

    // 1 bip
    digitalWrite(BUZZER, LOW);
    delay(200);
    digitalWrite(BUZZER, HIGH);

    // abre fechadura
    digitalWrite(LOCK, HIGH);
    Serial.println("ACESSO LIBERADO");

    delay(3000);

    digitalWrite(LOCK, LOW);
    Serial.println("Porta fechada");

  } else {
    // Cartão não autorizado

    Serial.println("ACESSO NEGADO");

    // 2 bips
    for (int i = 0; i < 2; i++) {
      digitalWrite(BUZZER, LOW);
      delay(150);
      digitalWrite(BUZZER, HIGH);
      delay(150);
    }
  }

  rfid.PICC_HaltA();
}