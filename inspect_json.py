import json

file_path = r'D:\ASD\data\dream_dataset\extracted\User 10\User 10_0_diagnosis abilities_20170508_104619.961000.json'
with open(file_path, 'r') as f:
    data = json.load(f)

print("Keys:", list(data.keys()))

if 'eye_gaze' in data:
    print("Eye Gaze keys:", list(data['eye_gaze'].keys()))
    if 'rx' in data['eye_gaze']:
        print("Eye Gaze rx length:", len(data['eye_gaze']['rx']))

if 'head_pose' in data:
    print("Head Pose keys:", list(data['head_pose'].keys()))

if 'skeleton' in data:
    print("Skeleton keys:", list(data['skeleton'].keys()))
    # Let's see one joint
    if len(data['skeleton']) > 0:
        first_key = list(data['skeleton'].keys())[0]
        print(f"Skeleton[{first_key}] keys:", list(data['skeleton'][first_key].keys()))
