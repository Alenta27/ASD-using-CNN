import zipfile
import os

zip_path = r'D:\ASD\data\dream_dataset\DREAMdataset.zip'
extract_to = r'D:\ASD\data\dream_dataset\extracted'

if not os.path.exists(extract_to):
    os.makedirs(extract_to)

print(f"Extracting {zip_path} to {extract_to}...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_to)
print("Done.")
