import os

path = r'D:\ASD\data\dream_dataset\extracted\User 10'
if os.path.exists(path):
    print(f"Contents of {path}:")
    for item in os.listdir(path):
        print(item)
else:
    print(f"Path {path} does not exist.")
