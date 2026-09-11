ffmpeg -i input.mp4 \
-c:v libx264 \
-profile:v baseline \
-level 3.0 \
-start_number 0 \
-hls_time 10 \
-hls_list_size 0 \
-f hls output.m3u8