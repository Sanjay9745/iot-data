### IOT Data Management
A scalable platform for collecting, processing, and analyzing IoT device data, with real-time monitoring and reporting capabilities.

### API Documentation
[Docs](https://docs.google.com/document/d/1dKr4WGfaIf7KDJN_8NFg8v6I_MQ81qGk1HXRMT61FE4/edit?usp=sharing)

## 🚀 Features

- **Device Management**: Register and track IoT devices
- **Data Collection**: Collect real-time analytics and uptime data from devices
- **Data Processing**: Process and analyze time-series data efficiently
- **User Authentication**: Secure API access with JWT authentication
- **Real-time Monitoring**: Track device connection status and performance metrics
- **Reporting**: Generate comprehensive reports on device uptime, performance, and analytics
- **Message Queue**: Reliable message processing with RabbitMQ
- **Horizontal Scaling**: Docker-based architecture for easy scaling

## 🛠️ Technology Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (time-series collections)
- **Caching**: Redis
- **Message Broker**: RabbitMQ
- **Authentication**: JWT (JSON Web Tokens)
- **Containerization**: Docker + Docker Compose

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js (16+) and npm (for local development)

## 🔧 Installation & Setup

## Import to Mongodb (Optional)
 - In the import-db folder has the necessary dummy data for running the project else skip this step and go accroding with the API Documentation provided and use generate command given in setup to get dummy data.
 
### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/iot-data.git
cd iot-data
```

2. Create a .env file (or use the example):
```
MONGO_URI=mongodb://mongodb:27017/iot
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=your-secret-key-here
```

3. Run the application:
```bash
docker-compose up
```

4. Run Build
```
docker-compose build
```

5. The API will be available at http://localhost:5000

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/iot-data.git
cd iot-data
```

2. Install dependencies:
```bash
npm install
```

3. Set up local instances of MongoDB, Redis, and RabbitMQ or update the .env file to point to your services.

4.Generate Dummy Data
```
npm run generate-data
```

5. Start the development server:
```bash
npm run dev
```

6. In a separate terminal, start the consumer:
```bash
npm run consumer-dev
```

## 📊 API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get JWT token

### Device Management
- `POST /api/devices` - Register a new device
- `POST /api/devices/data` - Submit device data
- `POST /api/devices/rmq` - Submit device data via RabbitMQ
- `GET /api/devices/analytics` - Get device analytics
- `GET /api/devices/uptime` - Get device uptime data
- `GET /api/devices/analytics/hourly` - Get hourly analytics data
- `GET /api/devices/uptime/state-changes` - Get device connection state changes
- `GET /api/devices/report` - Generate comprehensive device report

## 📁 Project Structure

```
├── src/
│   ├── config/          # Configuration files
│   ├── lib/             # Utility libraries
│   ├── middleware/      # Express middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── scripts/         # Data generation scripts
│   ├── services/        # Business logic
│   ├── consumer.ts      # RabbitMQ consumer
│   └── server.ts        # Express server
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker configuration
├── package.json         # NPM dependencies
└── tsconfig.json        # TypeScript configuration
```

## 🐳 Docker Services

- **app**: Main application server
- **consumer**: Background service for processing messages
- **mongodb**: Database server
- **redis**: Caching server
- **rabbitmq**: Message broker with management UI

## 📧 Contact

For questions or feedback, please contact [sanjaysanthosh919@gmail.com](mailto:sanjaysanthosh919@gmail.com).
