@echo off
echo Starting MongoDB...
echo.

REM Try common MongoDB installation paths
if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
    echo Found MongoDB 7.0
    "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
    goto :end
)

if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
    echo Found MongoDB 6.0
    "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath="C:\data\db"
    goto :end
)

if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
    echo Found MongoDB 5.0
    "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" --dbpath="C:\data\db"
    goto :end
)

if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
    echo Found MongoDB 4.4
    "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" --dbpath="C:\data\db"
    goto :end
)

echo MongoDB not found in common installation paths.
echo Please start MongoDB manually or update the path in this script.
pause

:end
