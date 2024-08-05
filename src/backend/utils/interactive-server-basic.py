import socket
import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    hostname = socket.gethostname()
    ip_address = socket.gethostbyname(hostname)
    port = 8000  # Replace with the actual port your server is running on
    print(f"Server is running on IP: {ip_address}, Port: {port}")

@app.get("/")
async def read_root():
    return {"Hello": "World"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)