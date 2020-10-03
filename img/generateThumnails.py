#pip install pillow
from PIL import Image
import glob
import os

files = glob.glob('./Core/*/*.png')

for inFile in files:
	outFile = inFile.replace(".png", ".thumb.jpg")

	image = Image.open(inFile);
	image = image.convert("RGB")
	image = image.resize((197, 272))
	image.save(outFile)

