#! /bin/bash

mkdir keys2

aws s3 cp s3://wishlist-sharer-keys/public.key keys2/public.key
aws s3 cp s3://wishlist-sharer-keys/private.key keys2/private.key