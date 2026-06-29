#include <Arduino_LSM6DS3.h>

/** pilotage du hardware de la tondeuse 
-          Readiness : R 
-          Order execution : D
-          Informations sent every ½ seconds
o   Position x
o   Position y
o   Direction (angle / degrees)
o   Speed (to determine)
o   Collision status
o   Battery status

-          Orders :
o   l : localization (arg – x, y) – when starting
o   a : step forward and stop
o   r : step backward and stop
o   t : turn (arg - degrees)
o   f : start stepping forward
o   b : start stepping backward
o   p : stop stepping
o   c : start/start cutting grass

**/


/** description du cablage */
const int PIN_PUL_DROITE = 3;
const int PIN_PUL_GAUCHE = 5;
const int PIN_DIR_DROITE = 2;
const int PIN_DIR_GAUCHE = 4;
const int PIN_BATTERY = A0;

const int PIN_BUMP_DROITE = 6;
const int PIN_BUMP_GAUCHE = 7;
const int PIN_LED_STOP = 1;
const int PIN_LED_CXN_OK = 8;

const int COL_NO_COLLISION = 0;
const int COL_DROITE = 1;
const int COL_GAUCHE = 2;

/** constantes de commandes */
const char CMD_LOCALISE = 'l';
const char CMD_AVANCE_STEP = 'a';
const char CMD_RECULE_STEP = 'r';
const char CMD_TOURNE = 't';
const char CMD_AVANCE = 'f';
const char CMD_RECULE = 'b';
const char CMD_STOPE = 'p';
const char CMD_TGL_COUPE = 'c';
const char CMD_INFO = 'i';

/*******Variables globales de positionnement *****/
float x = 0.0; // exprimé en cm
float y = 0.0; // exprimé en cm
float direction = 0.0; // angle par rapport à l'axe X
const float stepDist = 0.013;
int speed = 0; // speed = 0 => Arret 
int collision = COL_NO_COLLISION;

/*** positionnement avec le gyroscope interne */
float offset;
const boolean CHECK_ANGLE = false;

/*** COmmunication **/
unsigned long lastInfos; // date à laquelle ont été envoyées les dernières infos
unsigned long lastStep;
// Définit si on opére un nombre de pas donnes
unsigned long nbSteps;
unsigned long maxSteps; //  si maxSteps == -1 -> Pas de limites

const long BAUD_RATE = 38400;
const int INFO_DELAY= 2000; // nombre de ms entre deux envois d'informations
// Define stepper motor connections and steps per revolution:
#define stepsPerRevolution 1600

/** Gestion de l'accélération temporisation - us*/
int targetDelay = 50;

/** Gestion de la batterie  **/
#define minBatterie 9
#define maxBatterie 12.6
float minBat = floor((minBatterie*22.0/122.0/5.0)*1023.0); 
float maxBat = floor((maxBatterie*22.0/122.0/5.0)*1023.0);
int levelBatterie=100;


/** initialisation des données*/
void setup() {
  /** initialise la communication **/
  Serial.begin(BAUD_RATE);
  while (!Serial) {
    delay(10); // will pause Zero, Leonardo, etc until serial console opens
  }
  pinMode(PIN_LED_STOP, OUTPUT);
  pinMode(PIN_LED_CXN_OK, OUTPUT);
  digitalWrite(PIN_LED_STOP, LOW);
  digitalWrite(PIN_LED_CXN_OK, LOW);

 // Démarrage de la centrale inertielle
 if (!IMU.begin()) {
    digitalWrite(PIN_LED_STOP, HIGH);
    while (1);
  }
  
  /** Pilotage des moteurs*/
  pinMode(PIN_DIR_DROITE, OUTPUT);
  pinMode(PIN_DIR_GAUCHE, OUTPUT);
  pinMode(PIN_PUL_DROITE, OUTPUT);
  pinMode(PIN_PUL_GAUCHE, OUTPUT);
  pinMode(PIN_BUMP_DROITE, INPUT_PULLUP);
  pinMode(PIN_BUMP_GAUCHE, INPUT_PULLUP);
  pinMode(PIN_BATTERY, INPUT);

  /** Calcul de l'offset */
  calculeOffset();

  speed = 0;
  // Set the direction forward:
  digitalWrite(PIN_DIR_DROITE, HIGH);
  digitalWrite(PIN_DIR_GAUCHE, LOW);

  // setup des interruptions
  attachInterrupt(digitalPinToInterrupt(PIN_BUMP_DROITE), collisionEvent, RISING);
  attachInterrupt(digitalPinToInterrupt(PIN_BUMP_GAUCHE), collisionEvent, RISING);

  Serial.println("R"); /// tells the server I am ready
  digitalWrite(PIN_LED_CXN_OK, HIGH);
  lastInfos = millis();
  setSpeed(0, -1);
}

// retourne le nombre de tours pour faire un angle
//   3,8 tours pour 1 tour de roue
//Tour de roue = 2xPix6 = 38
// Pivotage 180 = Pix18 = 56
// 90 ° = 0.75 tours donc 2,85
// 180° = 1.5 tours
void tourneAngle (float deg) {
    noInterrupts();
    float targetAngle= deg;
    if (deg > 180) targetAngle = -180 + (deg - 180);
    if (deg < -180) targetAngle = 180 + (deg + 180);

    int echant =5;
    float Gz = 0;
    float gz;

    float a = 0;
    int nb = 0;
    unsigned long t0= micros();

    if (!CHECK_ANGLE){ // mode test n'utilise pas le gyro
      if ((a- targetAngle) > 0 ) {
        digitalWrite(PIN_DIR_DROITE, LOW);
        digitalWrite(PIN_DIR_GAUCHE, LOW);
      } else {
        digitalWrite(PIN_DIR_DROITE, HIGH);
        digitalWrite(PIN_DIR_GAUCHE, HIGH);
      }
      for (int i=0; i < 340; i++) {
        delayMicroseconds(120);
        digitalWrite(PIN_PUL_DROITE, HIGH);
        digitalWrite(PIN_PUL_GAUCHE, HIGH);
        delayMicroseconds(120); 
        digitalWrite(PIN_PUL_DROITE, LOW);
        digitalWrite(PIN_PUL_GAUCHE, LOW);
      }
    } else {
      int last=0;
      int nbBalance = 0;
  
      while (abs(a-targetAngle) > 0.5) {
        if (nb > echant) {
            unsigned long dt = abs(micros() - t0);
            float gx, gy, gyz;
            IMU.readGyroscope(gx, gy, gyz);
            gz=gyz+offset;  // Correction Offset
            Gz+=gz*(dt/1000);  // somme (pour integration)
            if (Gz > 138000) Gz = -138000;
            if (Gz < -138000) Gz = 138000;
            a=map(Gz/1000, -138, 138, -180, 180)/1.0;
  //          Serial.println("Angle "+String(gz)+","+String(dt)+","+String(Gz)+" "+String(targetAngle)+" "+String(a));
            t0= micros();
            nb= 0;
            if ((a- targetAngle) > 0 ) {
              if (last < 0) nbBalance ++;
              else nbBalance =0;
              last = 1;
            } else {
              if (last > 0) nbBalance ++;
              else nbBalance =0;
              last = -1;
            }
            if (nbBalance > 2) echant --;
            
            if (echant == 0) {
              return;
            }
        }
        if ((a- targetAngle) > 0 ) {
          digitalWrite(PIN_DIR_DROITE, LOW);
          digitalWrite(PIN_DIR_GAUCHE, LOW);
        } else {
          digitalWrite(PIN_DIR_DROITE, HIGH);
          digitalWrite(PIN_DIR_GAUCHE, HIGH);
        }
        delayMicroseconds(120);
        digitalWrite(PIN_PUL_DROITE, HIGH);
        digitalWrite(PIN_PUL_GAUCHE, HIGH);
        delayMicroseconds(120); 
        digitalWrite(PIN_PUL_DROITE, LOW);
        digitalWrite(PIN_PUL_GAUCHE, LOW);
        nb++;
      }
    }
    direction += targetAngle;
    if (direction  > 180) direction  = direction -360;
    if (direction  < -180) direction  = direction +360;

    interrupts();
}

//definit la vitesse de la tondeuse
// si négative, alors on recule
void setSpeed(int sp, long nb) { 
  speed = sp;
  double speedy = stepsPerRevolution*abs(speed); 
  targetDelay = (int) floor(1000000.0/speedy);
  nbSteps = 0;
  maxSteps = nb;
  lastStep = micros();
}

/** execute un step avec une temporisation donnée
   retourne le code en cas de collision
*/
void step (int temp1, int temp2) {
      // These four lines result in 1 step:
    delayMicroseconds(temp1);
    digitalWrite(PIN_PUL_DROITE, HIGH);
    digitalWrite(PIN_PUL_GAUCHE, HIGH);
    delayMicroseconds(temp2); 
    digitalWrite(PIN_PUL_DROITE, LOW);
    digitalWrite(PIN_PUL_GAUCHE, LOW);

    float d = speed/abs(speed);
    x += cos(direction)*stepDist*d;
    y += sin(direction)*stepDist*d;
}

void calculeOffset () {
  float Gz = 0;
  float gx, gy, gyz, gz;
//  Serial.println("Ne pas bouger, reglage offset...");
  for (int i=0; i < 200; i++) {            // on élimine les 200 premières mesures
     if (IMU.gyroscopeAvailable()) {
      IMU.readGyroscope(gx, gy, gz);
      delay(2);
     }
  }
  for (int i=0; i < 1000; i++){
    IMU.readGyroscope(gx, gy, gz);
    Gz+=gz;
    delay(2);
  }
  offset=-(Gz/1000.0);     // Moyenne sur 1000 mesures
//  Serial.println("Offset="+String(offset));
  delay(10000);
}

/*** gestion de la collision 
 * arret de la machine et identification d'ou vient la collision
 */
void collisionEvent() {
    if (digitalRead(PIN_BUMP_DROITE) == HIGH) {
      collision = COL_DROITE;
      speed = 0;
    } 

    if (digitalRead(PIN_BUMP_GAUCHE) == HIGH) {
      collision = COL_GAUCHE;
      speed = 0;
    }
}
/* decoupe la ligne de commande en instructions **/
int separate (String str, char **p, int size )
{
    int  n;
    char s [100];
    
    strcpy (s, str.c_str ());
    *p++ = strtok (s, " ");
    for (n = 1; NULL != (*p++ = strtok (NULL, " ")); n++)
        if (size == n)
            break;
    return n;
}

/**
Calcule le % de batterie observé
   Pont diviseur de tension => 10k / 32k
    i = T / 122K = t / 22k     
    T = t * 22k / 122 k = 0,18 t
   retourne un chiffre entre 0 et 100 % de batterie live
*/
void calculeBatterie() {
    float bat = analogRead(PIN_BATTERY); // Returns 0-1023 = t  1023 = 5v

    float pct= ((bat - minBat)/(maxBat-minBat))*100.0;
    if (pct > 100) pct = 100;  // put your setup code here, to run once:

    if (pct < 0) pct = 0;

    levelBatterie = floor(pct);
}




/** envoie les informations sur le robot à la base**/
void sendInfo () {
  if (Serial) {
      String str = String("I ");
      str.concat(String(x, 2));
      str.concat(" ");
      str.concat(String(y, 2));      
      str.concat(" ");      
      str.concat(String(direction));      
      str.concat(" ");      
      str.concat(speed);      
      str.concat(" ");
      str.concat(String(levelBatterie, 3));
      str.concat(" "); 
      str.concat(collision);
      Serial.println(str);
      lastInfos = millis();
  }
}

/*** Execute les ordres *************
const char CMD_LOCALISE = 'l';
const char CMD_AVANCE_STEP = 'a';
const char CMD_RECULE_STEP = 'r';
const char CMD_TOURNE = 't';
const char CMD_AVANCE = 'f';
const char CMD_RECULE = 'b';
const char CMD_STOPE = 'p';
const char CMD_TGL_COUPE = 'c';
const char CMD_INFO = 'i';
*************************************/
void executeInstruction(String cmd) {
    if (cmd[0] == CMD_LOCALISE) { // l x y 
        String coord = cmd.substring(2, cmd.length());
        int indx = coord.indexOf(" ");
        String valX = coord.substring(0, indx);
        coord = cmd.substring(indx+2);
        int indy = coord.indexOf(" ");
        String valY = coord.substring(0);
        if (indy != -1) {
          valY = coord.substring(0, indy-1);
        } 
        Serial.println("loc= "+cmd+" "+valX+" "+valY);
        x = valX.toFloat();
        y = valY.toFloat();
        Serial.println("Done");
    }
    if (cmd[0] == CMD_AVANCE_STEP) { // avance de 10 cm // sp =  
        digitalWrite(PIN_DIR_DROITE, HIGH);
        digitalWrite(PIN_DIR_GAUCHE, LOW);
        setSpeed(6, 770); // 10 cm
        Serial.println("Done");
    }
    if (cmd[0] == CMD_RECULE_STEP) { // recule de 10 cm // sp =  
        int sp = 6;
        long dist = 770; // 10 cm
        digitalWrite(PIN_DIR_DROITE, LOW);
        digitalWrite(PIN_DIR_GAUCHE, HIGH);
        setSpeed(-6, 770); // 10 cm
        Serial.println("Done");
    }
    if (cmd[0] == CMD_TOURNE) {
        String sp = cmd.substring(1, cmd.length());
        int a = sp.toInt();
        tourneAngle(a);
        Serial.println("Done");
    }
    if (cmd[0] == CMD_AVANCE) { // si recule actuellement > 
        if (speed < 0) {
          setSpeed(0, -1);
        } else {
          if (speed == 0) {
            digitalWrite(PIN_DIR_DROITE, HIGH);
            digitalWrite(PIN_DIR_GAUCHE, LOW);
            setSpeed(6, -1);
          }
        }
        Serial.println("Done");
    }
    if (cmd[0] == CMD_RECULE) { // avance de 10 cm // sp =  
        if (speed > 0) {
          setSpeed(0, -1);
        } else {
          if (speed == 0) {
            digitalWrite(PIN_DIR_DROITE, LOW);
            digitalWrite(PIN_DIR_GAUCHE, HIGH);
            setSpeed(-6, -1);
          }
        }
        Serial.println("Done");
    }
    if (cmd[0] == CMD_STOPE) {
        setSpeed(0, -1);
        Serial.println("Done");
    }
    if (cmd[0] == CMD_STOPE) {
        Serial.println("L Stoppe"); 
        speed = 0;
        Serial.println("Done");
    }
}


/**
 * Gere la communication avec le cerveau
 */
void loop() {
   // lecture sur Serial
   if (Serial.available()) {
    digitalWrite(PIN_LED_CXN_OK, HIGH);
    String cmd = Serial.readStringUntil('>');
    // lecture du premier caractere
    executeInstruction(cmd);
   }
   /**** Avance ***/
   if (speed != 0) {
     digitalWrite(PIN_LED_STOP, LOW);
     long delta = min(micros()-lastStep, targetDelay);
     step(targetDelay- delta, targetDelay);
     nbSteps ++;
     // Si un nombre de pas est défini, je le teste
     if (maxSteps != -1) {
        // si je depasse le nombre de pas
        if (nbSteps > maxSteps) {
          speed = 0;
          // renvoie un message - action terminée
          Serial.println("Done");
        }
     }
     lastStep = micros(); 
   } else {
    //Speed = 0, je me mets en attente
     digitalWrite(PIN_LED_STOP, HIGH);    
   }
  // envoie des informations quand le delai de comm est passé
  if (millis() > lastInfos+INFO_DELAY) {
       calculeBatterie();
       sendInfo();
  } 
}
