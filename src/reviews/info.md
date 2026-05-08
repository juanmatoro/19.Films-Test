# Reviews

- Tablas
  - reviews
    - film_id --> films.id
    - user_id --> users.id

- Endpoints

  - GET /reviews/film/:filmId [User]
  - GET /reviews/user/:userId [User]
  - GET /reviews/:filmId/:userId [User]

  - POST /reviews/:filmId/ [User] -> token :userId
  - PATCH /reviews/:filmId [User] -> token :userId
  - DELETE /reviews/:filmId [User] -> token :userId
