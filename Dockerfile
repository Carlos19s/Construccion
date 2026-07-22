FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto (Render inyecta PORT dinámicamente)
EXPOSE 4001

# Iniciar el servidor
CMD ["node", "src/index.js"]
