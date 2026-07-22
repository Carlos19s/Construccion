FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código del frontend
COPY . .

# Construir la aplicación Next.js
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Iniciar el servidor de Next.js
CMD ["npm", "start"]
