# Chelisty — MVP (Krok po kroku)

Aplikacja checklist z logowaniem, zapisem do Google Sheets i prostym dashboardem (chronionym hasłem). Ten poradnik prowadzi Cię **od zera do działania online**, jak dla osoby robiącej to **pierwszy raz**.

---

## 0) Wymagania
- **Node.js** 18 lub 20 → sprawdź: `node -v`
- **Konto Google** (do Google Sheets + Google Cloud)
- **Przeglądarka** (Chrome/Edge/Firefox)
- (Opcjonalnie) **GitHub** (ułatwia deploy do Vercel)

---

## 1) Pobierz i zainstaluj
1. Rozpakuj `chelisty-mvp.zip` na komputerze.
2. Otwórz terminal/cmd w folderze projektu.
3. Zainstaluj paczki:
   ```bash
   npm install
   ```

---

## 2) Arkusz Google Sheets (tworzenie + nagłówki)
1. Wejdź na https://sheets.google.com i utwórz **nowy Arkusz**.
2. W wierszu 1 wstaw nagłówki **dokładnie** tak (kolumny A–H):
   - A1: `timestamp`
   - B1: `date`
   - C1: `area`
   - D1: `checklist_id`
   - E1: `question_id`
   - F1: `question_text`
   - G1: `answer`
   - H1: `user_login`
3. Skopiuj **ID arkusza** z adresu URL (długi ciąg między `/d/` i `/edit`).
4. Nazwa pierwszej zakładki w arkuszu powinna być **`responses`** (jeśli jest „Arkusz1”, zmień nazwę zakładki na `responses`).

---

## 3) Google Cloud — konto serwisowe (Service Account) i klucz
1. Wejdź na https://console.cloud.google.com/ (zaloguj się na to samo konto Google).
2. Utwórz **projekt** (np. `chelisty`).
3. Włącz **Google Sheets API** (APIs & Services → *Enable APIs & Services* → wpisz „Google Sheets API” → *Enable*).
4. Utwórz **Service Account** (IAM & Admin → Service Accounts → *Create* → nazwa dowolna).
5. Wejdź w utworzone konto serwisowe → zakładka **Keys** → *Add key* → **JSON** → pobierz plik.
6. Otwórz utworzony Arkusz Google i **udostępnij** go temu mailowi z konta serwisowego (np. `nazwa@projekt.iam.gserviceaccount.com`) z uprawnieniem **Editor**.  
   > To **konieczne**, inaczej zapis się nie uda.

---

## 4) Ustawienia w `.env.local`
Utwórz plik `.env.local` w katalogu projektu i wklej (uzupełnij swoimi danymi):

```
# Logowanie (MVP — 1 konto)
ADMIN_LOGIN=twoj_login
ADMIN_PASSWORD=twoje_haslo

# Hasło do dashboardu (możesz zmienić)
DASHBOARD_PASSWORD=prezes123

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID=TU_WKLEJ_ID_ARKUSZA
GOOGLE_SERVICE_ACCOUNT_EMAIL=TU_WKLEJ_MAIL_SA
# Wklej CAŁĄ zawartość pliku JSON z kluczem jako JEDEN wiersz.
# Zamień nowe linie w kluczu prywatnym na \n
GOOGLE_SERVICE_ACCOUNT_KEY="{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}"
```

**Jak poprawnie wkleić klucz?**  
- Otwórz plik JSON z kluczem w edytorze.  
- Skopiuj wszystko i **zamień** wszystkie prawdziwe nowe linie w `private_key` na dosłowne `\n`.  
- Wklej w `.env.local` jako **jeden wiersz** (jak wyżej).

---

## 5) Uruchom lokalnie
```bash
npm run dev
```
Wejdź na **http://localhost:3000**. Zaloguj się danymi z `.env.local`.

**Test działania:**
1. Kliknij **Hotel** → **Otwarcie dzienne — hotel**.
2. Wypełnij i **Zapisz**.
3. Sprawdź arkusz: pojawią się nowe wiersze na zakładce `responses`.
4. Wejdź ponownie w **Hotel** — checklista **zniknie** na dziś (wróci jutro).

---

## 6) Dashboard (online podgląd dnia)
- Wejdź w **Dashboard**, wpisz hasło `DASHBOARD_PASSWORD` (domyślnie `prezes123`).  
- Zobaczysz: łączną liczbę odpowiedzi, ile checklist zakończonych (min. 1 wpis), rozbicie po obszarach, **godziny** wypełnień.

---

## 7) Edycja pytań i obszarów
- W pliku `data/checklists.json` edytuj listy dla: `Hotel`, `Restauracja`, `Budki`.
- Dostępne typy pytań: `boolean`, `number`, `text`.
- **Uwaga:** checklista uznana jest za „zrobioną dziś”, gdy **istnieje jakikolwiek wpis** dla jej `checklist_id` z dzisiejszą datą. (W kolejnej wersji można wymagać kompletu wszystkich pytań.)

---

## 8) Wystawienie ONLINE (Vercel) — prosto, krok po kroku
> Jeśli wolisz szczegółową wersję klik-po-kliku, zobacz plik **`DEPLOY-VERCEL.md`** w projekcie.

1. Załóż konto na **https://vercel.com** (możesz zalogować się przez GitHub/Google).
2. Jeśli nie masz GitHuba: załóż konto na https://github.com i utwórz nowe repo (np. `chelisty`).  
   Skopiuj do niego pliki projektu (pamiętaj: **nie wrzucaj** swoich `.env` do repo!).
3. Na Vercel kliknij **Add New Project** → **Import** swoje repo z GitHuba.
4. W kroku „Environment Variables” dodaj **WSZYSTKIE** zmienne z `.env.local`:
   - `ADMIN_LOGIN`
   - `ADMIN_PASSWORD`
   - `DASHBOARD_PASSWORD`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
5. Kliknij **Deploy**. Po chwili dostaniesz adres w stylu `https://twoj-projekt.vercel.app`.
6. Wejdź na stronę i przetestuj logowanie + zapis do arkusza.
7. **Ważne:** nie zapomnij udostępnić Arkusza **mailowi z Service Account** również dla środowiska produkcyjnego (to ten sam mail co lokalnie).

---

## 9) Częste problemy (i szybkie rozwiązania)
- **Zapis nie działa (błąd 500)**  
  - Sprawdź, czy ID arkusza jest poprawny.  
  - Czy arkusz ma zakładkę **`responses`** i nagłówki A–H jak w pkt. 2?  
  - Czy **Service Account** ma dostęp *Editor* do arkusza?  
  - Czy `GOOGLE_SERVICE_ACCOUNT_KEY` jest w jednym wierszu i ma `\n` w `private_key`?
- **Dashboard mówi, że hasło złe** → sprawdź `DASHBOARD_PASSWORD` w `.env`/Vercel ENV.
- **Brak „znikania” checklist na dziś** → upewnij się, że zapisujesz wypełnienie w tym samym dniu/tej samej strefie (aplikacja używa daty w formacie `YYYY-MM-DD` z czasu serwera).

---

## 10) Co dalej (opcje rozwoju)
- Wielu użytkowników + role (NextAuth + baza danych).
- Wymaganie kompletu odpowiedzi do uznania checklisty za „zrobioną”.
- Edytor checklist online (bez edycji plików).
- Eksport CSV/PDF, wykresy na dashboardzie.

Powodzenia! Jeśli utkniesz, zajrzyj do **DEPLOY-VERCEL.md** albo zapytaj :)
