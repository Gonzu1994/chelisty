# Deploy na Vercel — przewodnik dla początkujących

Ten dokument prowadzi Cię przez każdy krok publikacji aplikacji **Chelisty** online.

## 1) Przygotuj repozytorium (GitHub)
1. Wejdź na https://github.com → **New repository** → nazwij np. `chelisty` → **Create repository**.
2. Na komputerze w folderze `chelisty-mvp` wykonaj:
   ```bash
   git init
   git add .
   git commit -m "Chelisty MVP initial"
   git branch -M main
   git remote add origin https://github.com/TWOJ_LOGIN/chelisty.git
   git push -u origin main
   ```
3. Upewnij się, że plik `.gitignore` istnieje i **nie** wrzucasz `.env.local` (jest już skonfigurowane).

## 2) Import w Vercel
1. Wejdź na https://vercel.com → zaloguj się (np. przez GitHub).
2. Kliknij **Add New Project** → **Import** obok repo `chelisty`.
3. Vercel wykryje Next.js automatycznie. Kliknij **Continue**.

## 3) Ustaw **Environment Variables**
Dodaj po kolei (dokładnie jak w `.env.local` lokalnie):
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `DASHBOARD_PASSWORD`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_KEY`  *(jako jeden wiersz, z `\n` w kluczu prywatnym)*

Kliknij **Deploy**.

## 4) Udostępnij Arkusz Google kontu serwisowemu
- Otwórz swój arkusz w Google Sheets → **Share** → wklej adres e-mail z Service Account → **Editor** → **Send**.

## 5) Test produkcyjny
- Wejdź na wygenerowany adres (np. `https://chelisty.vercel.app`).  
- Zaloguj się i wypełnij testową checklistę.  
- Sprawdź arkusz, czy pojawiły się nowe wiersze.

## 6) Aktualizacje
- Gdy zmienisz pliki (np. `data/checklists.json`), zrób `git commit` + `git push`.  
- Vercel automatycznie wdroży nową wersję.  
- Jeśli dopisujesz **nowe zmienne** środowiskowe, dodaj je również w ustawieniach projektu na Vercel (Project Settings → Environment Variables) i zrób **Redeploy**.

## 7) Dodatkowe wskazówki
- Jeśli widzisz błędy, zajrzyj w **Vercel → Project → Deployments → Logs**.
- Jeśli zmieniasz arkusz, pamiętaj o **udostępnieniu** go mailowi Service Account.
- Domena własna: Vercel → **Settings → Domains** → dodaj domenę i skonfiguruj DNS wg instrukcji.

Gotowe! Twoja aplikacja jest online.
