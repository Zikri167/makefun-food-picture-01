# A bowl of ramen

This entry is a warm, appetizing photograph of ramen: glossy noodles rise
from the bowl between wooden chopsticks, beside soft eggs with golden yolks,
green onions, and rich broth.

The Node program reads the neighboring `entry.png` file, checks its JPEG
signature, size, frame dimensions, and ending marker, then copies the original
image bytes to the configured output directory as `entry.png`. It creates
that directory when needed and reports the output path, dimensions, byte
count, and SHA-256 digest.
The program also rejects source images smaller than 1024 bytes.
