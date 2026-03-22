# Sensor RFID para Controle de Acesso

Projeto da disciplina Projeto Integrador II (Engenharia de Computação - UFSM) para controlar o acesso aos laboratórios do Centro de Tecnologia usando um leitor RFID conectado a um ESP8266/ESP32.

## Integrantes
- Mikael Fontoura 
- Gabriel Schirmer
- Raissa Brodt 

## Objetivo e motivação
- Garantir controle de entrada e auditoria simples nos laboratórios por meio de tags RFID.
- Permitir atualização remota do firmware via OTA, facilitando correções e novas regras de acesso.
- Criar uma base que possa ser replicada em várias portas do Centro de Tecnologia.

## Arquitetura rápida
- **Leitor RFID** conectado ao ESP8266 faz a leitura da tag.
- **ESP8266** autentica a tag, aciona o atuador da fechadura e publica logs.
- **OTA habilitado** para atualizar o firmware sem desmontar o hardware.

## Componentes principais
- ESP8266 ou ESP32
- Leitor RFID e tags/chaves RFID
- Atuador de fechadura elétrica (ou relé/solenóide) acionado pelo pino D4
- Fonte 5V/3.3V e cabeamento de bancada
- Botões de acionamento

## Firmware (ESP8266)
O firmware principal está em [code-esp8266/code-esp8266.ino](code-esp8266/code-esp8266.ino). Ele inicia o Wi-Fi, habilita OTA e alterna o pino D4 para ligar um LED (teste).

### Dependências usadas no .ino
- `ESP8266WiFi`, `ESP8266mDNS`, `WiFiUdp`, `ArduinoOTA`