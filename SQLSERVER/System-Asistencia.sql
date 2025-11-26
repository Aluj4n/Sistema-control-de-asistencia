-- ===============================================================
-- SISTEMA DE CONTROL DE ASISTENCIA - ACTUALIZADO
-- ===============================================================

-- 1. Crear la base de datos
CREATE DATABASE SistemaAsistencia;
GO

-- 2. Usar la base de datos
USE SistemaAsistencia;
GO

-- 3. Crear tabla Empresas
CREATE TABLE Empresas (
    EmpresaID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL UNIQUE,
    Descripcion VARCHAR(100),
    LogoPath VARCHAR(255)
);
GO

-- 4. Crear tabla Empleados
CREATE TABLE Empleados (
    EmpleadoID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Apellidos VARCHAR(50) NOT NULL,
    DNI CHAR(8) NOT NULL UNIQUE,
    Telefono VARCHAR(15),
    Direccion VARCHAR(255),
    Cargo VARCHAR(50),
    FotoPath VARCHAR(255),
    EmpresaID INT NOT NULL,
    Usuario VARCHAR(50) NOT NULL,
    Contraseña VARCHAR(255) NOT NULL,
    Activo BIT DEFAULT 1,
    FechaInicioTurno DATE NULL,
    FechaFinTurno DATE NULL,
    FOREIGN KEY (EmpresaID) REFERENCES Empresas(EmpresaID) ON DELETE CASCADE
);
GO

-- 5. Crear tabla HorariosEmpleados
CREATE TABLE HorariosEmpleados (
    HorarioID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    DiaSemana INT NOT NULL, -- 1: Lunes, 2: Martes, ..., 7: Domingo
    HoraEntrada TIME,
    HoraSalida TIME,
    Activo BIT DEFAULT 1,
    FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID) ON DELETE CASCADE,
    CONSTRAINT UQ_Empleado_Dia UNIQUE (EmpleadoID, DiaSemana)
);
GO

-- 6. Crear tabla Asistencias
CREATE TABLE Asistencias (
    AsistenciaID INT IDENTITY(1,1) PRIMARY KEY,
    EmpleadoID INT NOT NULL,
    Fecha DATE NOT NULL,
    HoraEntrada DATETIME,
    HoraSalida DATETIME,
    FotoEntrada VARCHAR(255),
    FotoSalida VARCHAR(255),
    LatitudEntrada DECIMAL(10, 8),
    LongitudEntrada DECIMAL(10, 8),
    LatitudSalida DECIMAL(10, 8),
    LongitudSalida DECIMAL(10, 8),
    Estado VARCHAR(20) DEFAULT 'Pendiente',
    CONSTRAINT UQ_Empleado_Fecha UNIQUE (EmpleadoID, Fecha),
    FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID) ON DELETE CASCADE
);
GO

-- 7. Crear tabla UsuariosAdmin
CREATE TABLE UsuariosAdmin (
    AdminID INT IDENTITY(1,1) PRIMARY KEY,
    Usuario VARCHAR(50) NOT NULL UNIQUE,
    Contraseña VARCHAR(255) NOT NULL,
    NombreCompleto VARCHAR(100),
    UltimoAcceso DATETIME
);
GO

-- 8. Insertar empresas de prueba
INSERT INTO Empresas (Nombre, Descripcion, LogoPath) VALUES
('Nanas y Amas', 'Personal doméstico', 'images/logo-nanas.png'),
('Droguería Silsan', 'Colaboradores', 'images/logo-silsan.png'),
('Valverde', 'Personal operativo', 'images/logo-valverde.png');
GO

-- 9. Insertar administrador
INSERT INTO UsuariosAdmin (Usuario, Contraseña, NombreCompleto) 
VALUES ('admin', 'admin123', 'Administrador General');
GO

SELECT * FROM Empresas;
SELECT * FROM UsuariosAdmin;
GO
