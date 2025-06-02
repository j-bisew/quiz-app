# Quiz Backend

# ===== KOMENDY =====
### Uruchomienie wszystkich serwisów:
docker-compose up -d

# Uruchomienie tylko baz danych:
docker-compose up -d postgres mongodb

# Sprawdzenie logów konkretnego serwisu:
docker-compose logs -f user-service

# Restart konkretnego serwisu:
docker-compose restart quiz-service

# Zatrzymanie wszystkiego:
docker-compose down

# Usunięcie wszystkiego wraz z volumes:
docker-compose down -v
Julia Bisewska
