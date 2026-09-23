# 4Bit Studio Manager

Gestionale operativo interno di 4Bit Studio, costruito con lo stesso stack e linguaggio visuale di FlaToDo.

## V1

- Home con stato dei clienti e numero di task aperte come primo blocco.
- Task senza priorità.
- Pagamenti imminenti con countdown, sollecito e storico dei solleciti.
- Ricorrenze mensili, trimestrali, semestrali e annuali.
- Clienti attivi + archivio semplice.
- Scheda cliente con progetti, task, pagamenti, ricorrenze e contatti.
- Team dinamico; seed iniziale: Edoardo, Flavio, Francesco e Matteo.
- Workspace condiviso multiutente con accesso tramite codice studio.
- Supabase Auth/Postgres/RLS/Realtime.
- Responsive desktop/mobile in stile FlaToDo.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase · Vercel.

## Ambiente

Il frontend usa esclusivamente:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Non committare mai service role, secret key, password clienti o il codice di accesso al workspace.

## Sicurezza

Le credenziali presenti nel vecchio Excel non vengono importate. Per accessi WordPress, hosting e social usare un password manager o un vault dedicato.

Il codice studio attivo viene conservato solo come hash nel database e non è versionato nel repository.
