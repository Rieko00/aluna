from pathlib import Path

from huggingface_hub import login, upload_file, upload_folder


REPO_ID = "Rieko00/Aluna-models"
REPO_TYPE = "model"

# Point this at either a directory (to upload all contents) or a single file.
LOCAL_PATH = Path(r"E:\Data LIDC\Riset\Deploy\aluna\models\best.onnx")


def main() -> None:
	# Uses HF_TOKEN env var if set; otherwise prompts interactively.
	login()

	if LOCAL_PATH.is_dir():
		upload_folder(folder_path=str(LOCAL_PATH), repo_id=REPO_ID, repo_type=REPO_TYPE)
		return

	if LOCAL_PATH.is_file():
		upload_file(
			path_or_fileobj=str(LOCAL_PATH),
			path_in_repo=LOCAL_PATH.name,
			repo_id=REPO_ID,
			repo_type=REPO_TYPE,
		)
		return

	raise FileNotFoundError(f"Path does not exist: {LOCAL_PATH}")


if __name__ == "__main__":
	main()
