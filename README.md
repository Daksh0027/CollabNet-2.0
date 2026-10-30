# Here are your Instructions
## Run the backend with Docker

1. Copy `backend/.env.example` to `backend/.env` and add any optional AI or Stripe credentials.
2. Start the API and MongoDB:

   ```powershell
   docker compose up --build
   ```

3. Open the API at `http://localhost:8000/api/`.

The backend container listens on port `8000`. MongoDB data is persisted in the
named `mongo_data` volume. Stop the services with `docker compose down`.
