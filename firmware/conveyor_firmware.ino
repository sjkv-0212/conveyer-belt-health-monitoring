/*
 * ======================================================================================
 * INTELLIGENT CONVEYOR BELT MONITORING SYSTEM - ESP32 / ARDUINO FIRMWARE
 * Prototype Implementation matching all 15 Electronics & Sensor Components
 * ======================================================================================
 * 
 * Hardware Map:
 * 1.  ESP32 Development Board (Main MCU, Wi-Fi 802.11 b/g/n, Dual Core)
 * 2.  DC Geared Motor (12V, 60 RPM)
 * 3.  L298N Motor Driver Module (ENA=GPIO14, IN1=GPIO27, IN2=GPIO26)
 * 4.  MPU6050 Vibration & Shock Sensor (I2C: SDA=GPIO21, SCL=GPIO22, Addr=0x68)
 * 5.  DS18B20 Temperature Sensor (OneWire on GPIO4 - Waterproof Probe)
 * 6.  Load Cell (5kg) + HX711 Amplifier (DT=GPIO18, SCK=GPIO19)
 * 7.  IR Speed Sensor LM393 (Digital Tachometer Pulse on GPIO5)
 * 8.  Belt Alignment Sensor LM393 (IR Reflective Left/Right on GPIO34, GPIO35)
 * 9.  Microphone / Acoustic Sensor MAX9814 (Analog ADC on GPIO32)
 * 10. INA219 Current & Power Sensor (I2C: SDA=GPIO21, SCL=GPIO22, Addr=0x40)
 * 11. Tension Sensor Load Cell (HX711 #2: DT=GPIO16, SCK=GPIO17)
 * 12. Inductive Proximity / Displacement Sensor (GPIO33 via Voltage Divider)
 * 13. MLX90614 Non-Contact IR Thermal Sensor (I2C: SDA=GPIO21, SCL=GPIO22, Addr=0x5A)
 * 14. Camera Module / USB Webcam (Handled via OpenCV / USB Serial stream or ESP32-CAM)
 * 15. Buzzer + LEDs (Buzzer=GPIO12, Red LED=GPIO13, Yellow LED=GPIO2, Green LED=GPIO15)
 * ======================================================================================
 */

#include <Wire.h>
#include <WiFi.h>
#include <ArduinoJson.h>

// --- PIN DEFINITIONS ---
#define PIN_ONEWIRE_TEMP    4
#define PIN_SPEED_IR        5
#define PIN_BUZZER          12
#define PIN_LED_RED         13
#define PIN_LED_YELLOW      2
#define PIN_LED_GREEN       15
#define PIN_MOTOR_ENA       14
#define PIN_MOTOR_IN1       27
#define PIN_MOTOR_IN2       26
#define PIN_ALIGN_LEFT      34
#define PIN_ALIGN_RIGHT     35
#define PIN_ACOUSTIC_ADC    32
#define PIN_PROXIMITY       33
#define PIN_HX711_LOAD_DT   18
#define PIN_HX711_LOAD_SCK  19
#define PIN_HX711_TENS_DT   16
#define PIN_HX711_TENS_SCK  17

// --- SENSOR SIMULATION & SAMPLING VARIABLES ---
volatile unsigned long pulseCount = 0;
unsigned long lastSampleTime = 0;
const unsigned long SAMPLE_INTERVAL_MS = 250; // 4 Hz JSON telemetry stream

// Simulated baseline values for standalone demo
float beltSpeed = 1.28;       // m/s
float materialLoad = 4.35;    // kg
float bearingTemp = 38.6;     // °C
float irThermalTemp = 38.4;   // °C
float vibrationRMS = 2.45;    // mm/s
float alignmentDev = 2.1;     // mm
float beltTension = 6.2;      // kg
float motorCurrent = 1.35;    // A
float busVoltage = 12.08;     // V
float powerWatts = 16.3;      // W
float acousticDb = 54.2;      // dB
float proximityDisplace = 0.8;// mm
int healthScore = 82;         // 0-100%

// Speed sensor interrupt service routine
void IRAM_ATTR onSpeedPulse() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // Initialize GPIO Modes
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_MOTOR_ENA, OUTPUT);
  pinMode(PIN_MOTOR_IN1, OUTPUT);
  pinMode(PIN_MOTOR_IN2, OUTPUT);
  pinMode(PIN_SPEED_IR, INPUT_PULLUP);
  pinMode(PIN_PROXIMITY, INPUT);

  // Attach interrupt for speed optical encoder
  attachInterrupt(digitalPinToInterrupt(PIN_SPEED_IR), onSpeedPulse, RISING);

  // Start Motor at standard operating PWM
  digitalWrite(PIN_MOTOR_IN1, HIGH);
  digitalWrite(PIN_MOTOR_IN2, LOW);
  ledcAttach(PIN_MOTOR_ENA, 5000, 8); // 5 kHz PWM, 8-bit resolution
  ledcWrite(PIN_MOTOR_ENA, 200);      // ~78% duty cycle

  // I2C Bus initialization (MPU6050, INA219, MLX90614)
  Wire.begin(21, 22);

  // Set default Green status LED
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // Ready signal beep
  digitalWrite(PIN_BUZZER, HIGH);
  delay(100);
  digitalWrite(PIN_BUZZER, LOW);

  Serial.println(F("{\"system\":\"CONVEYOR_MONITOR_ESP32\",\"status\":\"ONLINE\",\"version\":\"2.4.0\"}"));
}

void loop() {
  unsigned long currentMillis = millis();

  // Process incoming commands from Web Dashboard over Serial
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("SET_SPEED:")) {
      int pwm = cmd.substring(10).toInt();
      ledcWrite(PIN_MOTOR_ENA, constrain(pwm, 0, 255));
    } else if (cmd.equals("ALARM_TEST")) {
      digitalWrite(PIN_BUZZER, HIGH);
      digitalWrite(PIN_LED_RED, HIGH);
      delay(200);
      digitalWrite(PIN_BUZZER, LOW);
      digitalWrite(PIN_LED_RED, LOW);
    }
  }

  // Periodic Telemetry Publishing
  if (currentMillis - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = currentMillis;

    // 1. Calculate Belt Speed from Optical Pulse Count
    // (Simulated with minor realistic noise)
    float jitter = ((float)random(-10, 11)) / 500.0;
    beltSpeed = constrain(beltSpeed + jitter, 1.15, 1.45);
    pulseCount = 0;

    // 2. Load Cell (Material Load)
    materialLoad = constrain(materialLoad + (((float)random(-15, 16)) / 300.0), 3.8, 5.5);

    // 3. Temperatures
    bearingTemp = constrain(bearingTemp + (((float)random(-8, 10)) / 200.0), 36.5, 42.5);
    irThermalTemp = bearingTemp - 0.2;

    // 4. MPU6050 Vibration RMS
    vibrationRMS = constrain(vibrationRMS + (((float)random(-10, 11)) / 300.0), 2.1, 3.2);

    // 5. Alignment Deviation
    alignmentDev = constrain(alignmentDev + (((float)random(-10, 11)) / 400.0), 1.7, 2.6);

    // 6. Belt Tension
    beltTension = constrain(beltTension + (((float)random(-10, 11)) / 350.0), 5.8, 6.8);

    // 7. INA219 Current & Power
    motorCurrent = (beltSpeed * 0.85) + (materialLoad * 0.06) + (((float)random(-5, 6)) / 200.0);
    busVoltage = 12.0 + (((float)random(-5, 6)) / 100.0);
    powerWatts = motorCurrent * busVoltage;

    // 8. Acoustic Sound Level (MAX9814)
    acousticDb = 50.0 + (vibrationRMS * 2.5) + ((float)random(0, 4));

    // 9. Inductive Pulley Displacement
    proximityDisplace = 0.8 + (((float)random(-5, 6)) / 100.0);

    // 10. Compute continuous health score
    float healthPenalty = (vibrationRMS > 4.5 ? 25 : 0) + 
                          (bearingTemp > 55 ? 20 : 0) + 
                          (alignmentDev > 3.0 ? 15 : 0) + 
                          (materialLoad > 8.0 ? 20 : 0);
    healthScore = max(10, min(100, (int)(95 - healthPenalty - (vibrationRMS * 3.0))));

    // LED Status Logic
    if (healthScore >= 70) {
      digitalWrite(PIN_LED_GREEN, HIGH);
      digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_RED, LOW);
    } else if (healthScore >= 40) {
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_YELLOW, HIGH);
      digitalWrite(PIN_LED_RED, LOW);
    } else {
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_RED, HIGH);
      // Trigger buzzer intermittently on critical fault
      if ((millis() / 500) % 2 == 0) digitalWrite(PIN_BUZZER, HIGH);
      else digitalWrite(PIN_BUZZER, LOW);
    }

    // Build and send JSON packet over Serial
    StaticJsonDocument<512> doc;
    doc["ts"] = millis();
    doc["speed"] = serialized(String(beltSpeed, 2));
    doc["load"] = serialized(String(materialLoad, 2));
    doc["temp_bearing"] = serialized(String(bearingTemp, 1));
    doc["temp_thermal"] = serialized(String(irThermalTemp, 1));
    doc["vibration"] = serialized(String(vibrationRMS, 2));
    doc["alignment"] = serialized(String(alignmentDev, 1));
    doc["tension"] = serialized(String(beltTension, 1));
    doc["current"] = serialized(String(motorCurrent, 2));
    doc["voltage"] = serialized(String(busVoltage, 2));
    doc["power"] = serialized(String(powerWatts, 1));
    doc["acoustic_db"] = serialized(String(acousticDb, 1));
    doc["displacement"] = serialized(String(proximityDisplace, 2));
    doc["health_score"] = healthScore;
    doc["status"] = (healthScore >= 70) ? "NORMAL" : ((healthScore >= 40) ? "WARNING" : "CRITICAL");

    serializeJson(doc, Serial);
    Serial.println();
  }
}
