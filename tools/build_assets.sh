#!/usr/bin/sh
# Earth images are from https://www.youtube.com/watch?v=Q1OreyX0-fw, which is licensed under CC BY (https://creativecommons.org/licenses/by/4.0/).
#TODO: what if that video goes down?
outdir=assets/earth_images
mkdir -p "$outdir"
if [ $(ls -1 "$outdir" | wc -l) -eq 19881 ] && [ "$1" != "-f" ]
then
    echo "Assets already present in $outdir (pass -f to re-extract them anyway)."
else
    echo "Extracting assets. This may take a very long time."
    rm -rf "$outdir/*"
    # Download the relevant section of the video
    #TODO can this be done in one pass? (without --exec)
    yt-dlp https://www.youtube.com/watch?v=Q1OreyX0-fw --download-sections "*18-11:20.7" --exec "ffmpeg -i {} $outdir/img%d.jpg"
    # Cut out the first 240 frames and adjust everything to match
    # (necessary unless we use --force-keyframes-at-cuts in ffmpeg, which makes it SO SLOW)
    ls -v $outdir | cat -n |
    while read num filename
    do
        if [ $num -ge 241 ]
        then
            mv -i -- "$outdir/$filename" "$outdir/img$(($num - 240)).jpg"
        else
            rm "$outdir/$filename"
        fi
    done
    # Delete intermediate file
    rm -f History\ of\ the\ Earth\ \[Q1OreyX0-fw\].webm
fi
