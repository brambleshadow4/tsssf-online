#pip install pillow
from PIL import Image
import glob
import os

def process(files):
	for inFile in files:
		outFile = inFile.replace(".png", ".thumb.jpg")

		image = Image.open(inFile);
		image = image.convert("RGB")
		image = image.resize((197, 272))
		image.save(outFile)


process(glob.glob('./Core/*/*.png'))
process(glob.glob('./EC/*/*.png'))
process(glob.glob('./PU/*/*.png'))
