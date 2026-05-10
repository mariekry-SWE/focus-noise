# QA-checklista – Focus Noise

Kör i **dev client** (inte Expo Go). För snabba sessiontester: `USE_SHORT_SESSION_TIMERS_FOR_QA = true` i `app/index.tsx`. För produktionslängder innan release: sätt den till `false` (gäller bara `__DEV__`).

## Kärnspelning

- [ ] Öppna varje kategori (white / pink / brown), spela första spåret – ljud startar utan fel.
- [ ] Pausa och återuppta samma spår.
- [ ] Byt till annat spår i samma kategori – föregående stoppas, nytt startar.
- [ ] Stäng overlay-spelaren – ljud stoppar, listan uppdateras.

## Free vs premium

- [ ] **Free:** andra spåret (hänglås) öppnar paywall vid tryck.
- [ ] **Free:** första spåret stoppar efter sessiongräns (20 s i QA-läge, 30 min i prod-läge) och visar session-dialog om det är första spåret.
- [ ] **Premium:** andra spåret spelar; session för icke-första spår följer premium-gräns (45 s i QA, 8 h i prod).

## Paywall & köp

- [ ] Inställningar → **Uppgradera till Unlimited** → paywall öppnas.
- [ ] Efter session-slut → **Ja, jag testar gärna Premium** → paywall öppnas.
- [ ] **Visa premiumalternativ** visar RevenueCat-paywall (eller tydligt fel om offering saknas).
- [ ] **Återställ köp** kör utan krasch (testa i dev / sandbox enligt er setup).

## Bakgrund & återgång

- [ ] Spela, byt till annan app, gå tillbaka – spelaren ska **inte** stängas bara för att appen blev aktiv igen.
- [ ] Efter att sessiontiden passerat i bakgrunden: vid återgång ska sessionen avslutas korrekt om klockan passerat sluttid.

## Regression (overlay / navigation)

- [ ] Ingen orange debug-ruta synlig på startsidan.
- [ ] **Tillbaka** från paywall fungerar (ingen `GO_BACK`-varning).
- [ ] Hantera abonnemang (inställningar) öppnar förväntat flöde.

## Efter QA med korta tider

- [ ] Sätt `USE_SHORT_SESSION_TIMERS_FOR_QA` till `false` och kör minst en gång med **riktiga** 30 min / 8 h innan extern test eller release.
