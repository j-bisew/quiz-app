# Quiz App

A microservices-based quiz application — demonstration of backend architecture, containerization, and service orchestration.  
This project showcases skills in Node.js / TypeScript, Docker, and distributed services.

---

## Table of Contents

1. [About the Project](#about-the-project)  
2. [Architecture & Tech Stack](#architecture--tech-stack)  
3. [Getting Started](#getting-started)  
   - [Prerequisites](#prerequisites)  
   - [Installation & Running](#installation--running)  
4. [Services Breakdown](#services-breakdown)  
5. [Usage](#usage)  


---

## About the Project

The **Quiz App** is a backend-oriented project structured as multiple services communicating to deliver quiz functionality. It is designed as a learning project to demonstrate backend design principles, containerization, and service orchestration using Docker.  

Key motivations:

- Explore microservices architecture  
- Use of Docker & docker-compose for orchestration  
- Separation of concerns: quiz logic, user management, analytics  
- Clean structure and modular codebase  

---

## Architecture & Tech Stack

| Component / Layer | Technology / Tool |
|-------------------|-------------------|
| Language / Runtime | **Node.js** with **TypeScript** |
| Services | `user-service`, `quiz-service`, `analytics-service` |
| Orchestration | **Docker**, **docker-compose** |
| Databases | PostgreSQL, MongoDB |
| Communication | Internal REST / HTTP APIs |
| Scripts / Automation | npm scripts, shell scripts |
| Configuration | Environment variables, Docker networking |

The code is organized into separate service folders, each with its own `package.json` and dependencies, enabling independent development and scaling.

---

## Getting Started

### Prerequisites

Before you begin, make sure you have:

- **Docker** and **docker-compose** installed  

### Installation & Running

1. Clone the repo:

   ```bash
   git clone https://github.com/j-bisew/quiz-app.git
   cd quiz-app
   ```

   
2. Start all services:

   ```bash
   docker-compose up -d
   ```

3. (Optional) If you want to spin up only the databases:

   ```bash
   docker-compose up -d postgres mongodb
   ```

4. To view logs or debug:

   ```bash
   docker-compose logs -f user-service
   # Or restart just one service:
   docker-compose restart quiz-service
   ```

5. To stop and clean up:

   ```bash
   docker-compose down
   # To also remove volumes:
   docker-compose down -v
   ```

---

## Services Breakdown

* **user-service**
  Manages user registration, authentication, profiles.

* **quiz-service**
  Handles quiz creation, question delivery, answer evaluation, scoring.

* **analytics-service**
  Collects usage data, performance metrics, user stats for insights.

Each service is independent, with its own endpoints, data store, and logic, allowing cleaner separation and scalability.

---

## Usage

Once all services are running, you can interact via HTTP endpoints. Example (using `curl` or a client):

* Register / authenticate users
* Create quizzes or fetch existing quizzes
* Submit answers and receive results
* View analytics data

