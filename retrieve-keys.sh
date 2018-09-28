#! /bin/bash

mkdir keys

aws s3 cp s3://wishlist-sharer-keys/public.key keys/public.key
aws s3 cp s3://wishlist-sharer-keys/private.key keys/private.key