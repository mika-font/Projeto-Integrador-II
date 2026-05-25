# Sensor RFID para Controle de Acesso

> Projeto integrante da disciplina Projeto Integrador II — Engenharia de Computação (UFSM).

Sistema de controle de acesso para laboratórios usando leitor RFID conectado a um ESP8266/ESP32. Suporta atualização remota (OTA) e registro básico de eventos.



## Sumário

- [Integrantes](#integrantes)
- [Objetivos](#objetivos)
- [Arquitetura](#arquitetura)
- [Hardware](#hardware)
- [Firmware](#firmware)
- [Instalação](#instalação)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Em desenvolvimento](#em-desenvolvimento)


## Integrantes do Projeto

- Gabriel Schirmer
- Mikael Fontoura
- Raissa Brodt

## Objetivos

Os principais objetivos em desenvolvimento do projeto:

- Controlar o acesso ao laboratório usando um sistema RFID;
- Permitir atualização remota do *firmware* via OTA;
- Registrar eventos de acesso (autorizados e não autorizados);
- Criar uma interface de gerenciamento de tags;

## Arquitetura

Fluxo básico:

1. Tag aproximada ao leitor;
2. Leitor envia ID ao microcontrolador;
3. Microcontrolador verifica autorização;
4. Se autorizado: ativa a fechadura e registra evento;
5. Se não autorizado: registra tentativa e ignora;

## Hardware

Componentes principais:

- ESP8266 ou ESP32
- Leitor RFID (módulo RC522)
- Tags RFID compatíveis
- Fechadura solenóide
- Fonte 12V 3A
- Regulador de Tensão de 12V para 5V (L7805CV)
- Buzzer HNT-1205
- LED Verde e Vermelho
- Transistor TIP31C e Diodo 1N4007
- Resistores (1kΩ)

Pinagem de referência (ESP32):
- `D5` (GPIO2): Saída para relé/fechadura

## Firmware

Versões disponíveis:

- `code-esp8266/code-esp8266.ino` — implementação base para ESP8266
- `code-esp32/code-esp32.ino` — implementação base para ESP32 (Em Funcionamento)

Principais funcionalidades do firmware:

- Leitura de tag RFID via serial
- Lista local de tags autorizadas
- Acionamento da fechadura (pino `D5` no ESP32)
- Atualização OTA (ArduinoOTA)
- Logs básicos por serial (e opcionalmente via rede)

Dependências:

- `WiFi`
- `ArduinoOTA`
- `SPI` 
- `MFRC522`

---

## Instalação

Pré-requisitos:

- Arduino IDE
- Drivers USB (CH340/CP210x) instalados
- Placa ESP8266/ESP32 adicionada no Arduino IDE

Passos rápidos:

1. Abra o Arduino IDE
2. Instale as bibliotecas necessárias via Gerenciador de Placas
3. Para o ESP32, usamos uma URL adicional: "https://espressif.github.io/arduino-esp32/package_esp32_index.json"
4. Após adicionar essa URL, em Gerenciador de Placas, instale a biblioteca do ESP32
5. Selecione a placa apropriada em `Ferramentas → Placa`
6. Abra o código `code-esp8266/code-esp8266.ino` ou `code-esp32/code-esp32.ino`
7. Compile e faça o upload para o dispositivo

Configuração OTA: o firmware habilita `ArduinoOTA` — para usar, conecte o dispositivo à mesma rede do computador e selecione a porta de rede no IDE.

## Uso

1. Energize o sistema com a fonte adequada
2. Aproxime uma tag ao leitor
3. Observe o LED de status e o comportamento do relé
4. Verifique saídas seriais para logs e depuração

---

## Estrutura do Projeto

```
Projeto-Integrador-II/
├── README.md
├── code-esp8266/
├── code-esp32/
├── impressoes/
│   ├── porta_mdf/
│   ├── case_interno/
│   └── case_externo/
└── docs/
```

## Ferramentas Utilizadas

### Hardware e Firmware

- Arduino IDE — desenvolvimento e upload dos sketches
- Drivers USB: CH340 / CP210x
- Bibliotecas ESP32 usadas no firmware: `WiFi.h`, `ArduinoOTA.h`, `SPI.h`, `MFRC522.h` (ver `code-esp32/`)
- Software CAD para arquivos `.SLDPRT` / `.SLDASM`: SolidWorks 2024
- Software para `.DXF` : SolidWorks 2024 (exportação)
- Software para `.STL` : Ultimaker Cura 5.4.0

### Interface, Banco de Dados, Dashboard e Documentação

- Visual Studio Code — desenvolvimento de interface e scripts
- Software para Dashboard: Grafana
- Software para Banco de Dados: (definir)
- FrontEnd: (definir)
- BackEnd: (definir)
- Diagramas e Documentação: LucidChart, Google Docs e Canva

### Demais Ferramentas

- Git e GitHub — controle de versão e hospedagem do código

## Em desenvolvimento

- [x] Firmware base (ESP32)
- [x] Testes de campo com fechadura real
- [ ] Interface de gerenciamento de tags
- [ ] Registro remoto de logs (server)

Se você quiser contribuir, abra uma issue ou envie um pull request.