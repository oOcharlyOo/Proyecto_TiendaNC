FROM nginx:alpine

# Define an argument for the API URL, with a default value for local development if not provided
ARG API_URL=http://localhost:8080

# Copy all application files into the Nginx serve directory
COPY . /usr/share/nginx/html

# Use sed to replace the API_BASE_URL placeholder in JavaScript files
# The placeholder must be exact, including the quotes
# We use find to target only the JS files and ensure the replacement happens
RUN find /usr/share/nginx/html -name "*.js" -print0 | xargs -0 sed -i "s|__API_BASE_URL__|${API_URL}|g"

# Expose port 80 (default for Nginx)
EXPOSE 80

# Command to run Nginx (default in nginx:alpine image)
CMD ["nginx", "-g", "daemon off;"]