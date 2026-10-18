# Treeni Liukuri – production image (Vaadin 25 / Hilla + Spring Boot 4, Java 21)
# Build:  docker build -t treeni-liukuri .
# Run:    docker run -p 8080:8080 treeni-liukuri
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
# No Node install needed: the Vaadin Maven plugin downloads a supported Node.js into ~/.vaadin
# for the Vite frontend build. Unit tests (Vitest) are skipped in the image build.
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -B -ntp dependency:go-offline -Pproduction || true
COPY package.json package-lock.json tsconfig.json types.d.ts vite.config.ts vitest.config.ts ./
COPY src src
RUN ./mvnw -B -ntp -Pproduction -DskipTests clean package && cp target/treeni-liukuri-*.jar /app/app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 app
COPY --from=build /app/app.jar app.jar
USER app
ENV PORT=8080 JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
